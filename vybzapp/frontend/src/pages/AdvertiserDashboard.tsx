import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AdvertiserProfile,
  AdCampaign,
  AdCreative,
  AdReport,
  AdStaffSnapshot,
  apiService
} from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

type AdsTab = 'overview' | 'advertiser' | 'setup' | 'billing';

const TABS: Array<{ id: AdsTab; label: string; icon: string; needsAdvertiser?: boolean }> = [
  { id: 'overview', label: 'Overview', icon: 'fa-table' },
  { id: 'advertiser', label: 'Reporting', icon: 'fa-chart-line', needsAdvertiser: true },
  { id: 'setup', label: 'Setup', icon: 'fa-wrench', needsAdvertiser: true },
  { id: 'billing', label: 'Billing', icon: 'fa-file-invoice-dollar', needsAdvertiser: true },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'live', label: 'Live' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'needs_platform_scene', label: 'Scene not ad-enabled' },
  { value: 'ready', label: 'Ready' },
];

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    live: 'Live',
    pending_approval: 'Pending approval',
    inactive: 'Inactive',
    needs_platform_scene: 'Scene not ad-enabled',
    ready: 'Ready',
  };
  return labels[status] || status.replace(/_/g, ' ');
}

function statusBadgeClass(status: string, isLive: boolean): string {
  if (isLive) return 'bg-success';
  if (status === 'pending_approval') return 'bg-warning text-dark';
  if (status === 'inactive') return 'bg-secondary';
  if (status === 'needs_platform_scene') return 'bg-info text-dark';
  return 'bg-primary';
}

function GoLiveChecks({ checks, compact = false }: {
  checks: AdStaffSnapshot['placements'][0]['go_live'];
  compact?: boolean;
}) {
  const items = [
    { key: 'advertiser_approved', label: 'Advertiser' },
    { key: 'creative_approved', label: 'Creative' },
    { key: 'campaign_active', label: 'Campaign' },
    { key: 'placement_active', label: 'Placement' },
    { key: 'ad_enabled_season', label: 'Scene' },
  ] as const;

  if (compact) {
    const passed = items.filter((item) => checks[item.key]).length;
    return (
      <span className="small text-muted" title={items.map((item) => `${item.label}: ${checks[item.key] ? 'OK' : 'Missing'}`).join('\n')}>
        {passed}/{items.length} checks
      </span>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-1 ads-go-live">
      {items.map((item) => {
        const ok = checks[item.key];
        return (
          <span
            key={item.key}
            className={`badge ${ok ? 'bg-success' : 'bg-light text-dark border'}`}
            title={`${item.label}: ${ok ? 'OK' : 'Missing'}`}
          >
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

function AdvertiserRequired({ onGoOverview }: { onGoOverview: () => void }) {
  return (
    <div className="ads-emptyState text-center py-5">
      <i className="fas fa-user-tie fa-2x text-muted mb-3" aria-hidden />
      <p className="text-muted mb-3">Select an advertiser from the toolbar or click a row on Overview.</p>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onGoOverview}>
        Go to Overview
      </button>
    </div>
  );
}

const AdvertiserDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AdsTab) || 'overview';
  const advertiserParam = searchParams.get('advertiser');

  const [snapshot, setSnapshot] = useState<AdStaffSnapshot | null>(null);
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<number | null>(
    advertiserParam ? Number(advertiserParam) : null
  );
  const [staffProfile, setStaffProfile] = useState<AdvertiserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [report, setReport] = useState<AdReport | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const [isLoadingAdvertiser, setIsLoadingAdvertiser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [placementSearch, setPlacementSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [liveOnly, setLiveOnly] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    contact_name: '',
    contact_email: '',
    website_url: '',
    notes: ''
  });
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    budget_label: ''
  });
  const [creativeForm, setCreativeForm] = useState<{
    campaign: string;
    title: string;
    destination_url: string;
    alt_text: string;
    image: File | null;
  }>({
    campaign: '',
    title: '',
    destination_url: '',
    alt_text: '',
    image: null
  });
  const now = new Date();
  const [invoiceForm, setInvoiceForm] = useState({
    campaign_id: '',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    amount: '',
    notes: ''
  });

  const selectedAdvertiser = useMemo(
    () => snapshot?.advertisers.find((row) => row.id === selectedAdvertiserId) || null,
    [snapshot, selectedAdvertiserId]
  );

  const filteredPlacements = useMemo(() => {
    if (!snapshot) return [];
    const query = placementSearch.trim().toLowerCase();
    return snapshot.placements.filter((row) => {
      if (liveOnly && !row.is_live) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        row.advertiser_name,
        row.campaign_name,
        row.creative_title,
        row.season_label,
        row.episode_scope,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [snapshot, placementSearch, statusFilter, liveOnly]);

  const blockedPlacements = useMemo(
    () => report?.advertiser.go_live_placements?.filter((row) => !row.is_live) || [],
    [report]
  );

  const setTab = useCallback((tab: AdsTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (selectedAdvertiserId) {
        next.set('advertiser', String(selectedAdvertiserId));
      }
      return next;
    }, { replace: true });
  }, [selectedAdvertiserId, setSearchParams]);

  const loadSnapshot = useCallback(async () => {
    setIsLoadingSnapshot(true);
    try {
      const snapshotResult = await apiService.getAdStaffSnapshot();
      setSnapshot(snapshotResult);
      if (!selectedAdvertiserId && snapshotResult.advertisers[0]?.id) {
        const firstId = snapshotResult.advertisers[0].id;
        setSelectedAdvertiserId(firstId);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('advertiser', String(firstId));
          return next;
        }, { replace: true });
      }
    } catch (error) {
      console.error('Failed to load ad snapshot:', error);
      setMessage('Unable to load ad overview. Please sign in and try again.');
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [selectedAdvertiserId, setSearchParams]);

  const loadAdvertiserData = useCallback(async (advertiserId: number) => {
    setIsLoadingAdvertiser(true);
    try {
      const [reportResult, campaignResult, creativeResult] = await Promise.all([
        apiService.getAdReport(advertiserId),
        apiService.getAdCampaigns(advertiserId),
        apiService.getAdCreatives(advertiserId)
      ]);
      setReport(reportResult);
      setCampaigns(campaignResult);
      setCreatives(creativeResult);
      setInvoiceForm((prev) => ({
        ...prev,
        campaign_id: prev.campaign_id || (campaignResult[0] ? String(campaignResult[0].id) : '')
      }));
    } catch (error) {
      console.error('Failed to load advertiser data:', error);
      setMessage('Could not load data for the selected advertiser.');
    } finally {
      setIsLoadingAdvertiser(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await loadSnapshot();
    if (selectedAdvertiserId) {
      await loadAdvertiserData(selectedAdvertiserId);
    }
  }, [loadSnapshot, loadAdvertiserData, selectedAdvertiserId]);

  useEffect(() => {
    loadSnapshot();
    apiService.getAdvertiserProfile().then((profile) => {
      if (profile) {
        setStaffProfile(profile);
        setProfileForm({
          business_name: profile.business_name || '',
          contact_name: profile.contact_name || '',
          contact_email: profile.contact_email || '',
          website_url: profile.website_url || '',
          notes: profile.notes || ''
        });
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (selectedAdvertiserId) {
      loadAdvertiserData(selectedAdvertiserId);
    }
  }, [selectedAdvertiserId, loadAdvertiserData]);

  const selectAdvertiser = (advertiserId: number | null, tab?: AdsTab) => {
    setSelectedAdvertiserId(advertiserId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (advertiserId) {
        next.set('advertiser', String(advertiserId));
      } else {
        next.delete('advertiser');
      }
      if (tab) {
        next.set('tab', tab);
      }
      return next;
    }, { replace: true });
  };

  const handleAdvertiserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value ? Number(event.target.value) : null;
    selectAdvertiser(nextId);
  };

  const handlePlacementRowClick = (advertiserId: number) => {
    selectAdvertiser(advertiserId, 'advertiser');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const saved = await apiService.saveAdvertiserProfile({
        ...profileForm,
        website_url: normalizeUrlInput(profileForm.website_url)
      });
      setStaffProfile(saved);
      setMessage('Staff-linked profile saved. Admin approval is required before ads can run.');
      await loadSnapshot();
    } catch (error) {
      console.error('Failed to save advertiser profile:', error);
      setMessage('Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAdvertiserId) {
      setMessage('Select an advertiser before creating a campaign.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await apiService.createAdCampaign({
        ...campaignForm,
        advertiser_id: selectedAdvertiserId,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        is_active: true
      });
      setCampaignForm({ name: '', start_date: '', end_date: '', budget_label: '' });
      setMessage('Campaign created.');
      await refreshAll();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      setMessage('Could not create campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  const submitCreative = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAdvertiserId) {
      setMessage('Select an advertiser before submitting a creative.');
      return;
    }
    if (!creativeForm.image) {
      setMessage('Choose an ad image before submitting a creative.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      await apiService.createAdCreative({
        advertiser_id: selectedAdvertiserId,
        campaign: creativeForm.campaign ? Number(creativeForm.campaign) : null,
        title: creativeForm.title,
        destination_url: normalizeUrlInput(creativeForm.destination_url),
        alt_text: creativeForm.alt_text,
        image: creativeForm.image
      });
      setCreativeForm({ campaign: '', title: '', destination_url: '', alt_text: '', image: null });
      setMessage('Creative submitted for review.');
      await refreshAll();
    } catch (error) {
      console.error('Failed to submit creative:', error);
      setMessage('Could not submit creative.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAdvertiserId || !invoiceForm.campaign_id) {
      setMessage('Select an advertiser and campaign for the invoice.');
      return;
    }
    const amount = Number(invoiceForm.amount);
    if (!amount || amount <= 0) {
      setMessage('Enter a valid invoice amount.');
      return;
    }
    setIsSaving(true);
    setMessage('');
    try {
      const result = await apiService.generateAdInvoice({
        advertiser_id: selectedAdvertiserId,
        campaign_id: Number(invoiceForm.campaign_id),
        year: invoiceForm.year,
        month: invoiceForm.month,
        amount,
        notes: invoiceForm.notes
      });
      window.open(result.pdf_url, '_blank', 'noopener,noreferrer');
      setMessage(`Invoice ${result.invoice_number} generated.`);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      setMessage('Could not generate invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSnapshot && !snapshot) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading ad dashboard..." />
          </div>
        </section>
      </div>
    );
  }

  const advertiserTotals = report?.advertiser.totals;
  const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];
  const tabNeedsAdvertiser = Boolean(currentTab.needsAdvertiser && !selectedAdvertiserId);

  return (
    <div className="product-landing ads-dashboard">
      <MessagePopup
        message={message}
        type={message.toLowerCase().includes('could not') || message.toLowerCase().includes('unable') ? 'danger' : 'info'}
        show={Boolean(message)}
        onClose={() => setMessage('')}
        duration={4000}
      />

      <section className="product-landing__section product-landing__hero pb-3">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">Staff Tools</p>
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
            <div>
              <h1 className="product-landing__h1">3D Ad Machine</h1>
              <p className="product-landing__lead mb-0">
                Operations hub for placements, advertiser reporting, and billing.
              </p>
            </div>
            {snapshot && (
              <div className="ads-kpiStrip">
                <div className="ads-kpi">
                  <div className="ads-kpi__value">{snapshot.totals.live}</div>
                  <div className="ads-kpi__label">Live</div>
                </div>
                <div className="ads-kpi">
                  <div className="ads-kpi__value">{snapshot.totals.placements}</div>
                  <div className="ads-kpi__label">Placements</div>
                </div>
                <div className="ads-kpi">
                  <div className="ads-kpi__value">{snapshot.totals.advertisers}</div>
                  <div className="ads-kpi__label">Advertisers</div>
                </div>
                <div className="ads-kpi">
                  <div className="ads-kpi__value">{snapshot.placements.filter((row) => !row.is_live).length}</div>
                  <div className="ads-kpi__label">Not live</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="ads-toolbar sticky-top">
        <div className="product-landing__container">
          <div className="ads-toolbar__inner">
            <nav className="ads-tabs" aria-label="Ad dashboard sections">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`ads-tabs__btn ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setTab(tab.id)}
                >
                  <i className={`fas ${tab.icon}`} aria-hidden />
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="ads-toolbar__actions">
              <select
                className="form-select form-select-sm ads-toolbar__select"
                value={selectedAdvertiserId ?? ''}
                onChange={handleAdvertiserChange}
                aria-label="Selected advertiser"
              >
                <option value="">All advertisers…</option>
                {snapshot?.advertisers.map((advertiser) => (
                  <option key={advertiser.id} value={advertiser.id}>
                    {advertiser.business_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => refreshAll()}
                disabled={isLoadingSnapshot || isLoadingAdvertiser}
                title="Refresh data"
              >
                <i className={`fas fa-sync-alt ${isLoadingSnapshot || isLoadingAdvertiser ? 'fa-spin' : ''}`} aria-hidden />
              </button>
              <a
                href="/admin/icvybz/adplacement/"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-secondary btn-sm"
              >
                Admin
              </a>
            </div>
          </div>
          {selectedAdvertiser && (
            <div className="ads-toolbar__meta small text-muted">
              {selectedAdvertiser.contact_name && <span>{selectedAdvertiser.contact_name} · </span>}
              {selectedAdvertiser.contact_email}
              <span className={`badge ms-2 ${selectedAdvertiser.status === 'approved' ? 'bg-success' : 'bg-secondary'}`}>
                {selectedAdvertiser.status}
              </span>
            </div>
          )}
        </div>
      </div>

      <section className="product-landing__section pt-3 pb-5">
        <div className="product-landing__container">
          {isLoadingAdvertiser && activeTab !== 'overview' ? (
            <div className="py-4 text-center">
              <LoadingSpinner message="Loading advertiser data…" />
            </div>
          ) : null}

          {!isLoadingAdvertiser && tabNeedsAdvertiser ? (
            <AdvertiserRequired onGoOverview={() => setTab('overview')} />
          ) : null}

          {!tabNeedsAdvertiser && activeTab === 'overview' && (
            <div className="my-studio__panel">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-table" aria-hidden />
                  <span className="my-studio__panelTitleText">All placements</span>
                </h2>
              </div>
              <div className="my-studio__panelBody">
                <div className="row g-2 mb-3">
                  <div className="col-md-5">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Search advertiser, campaign, season…"
                      value={placementSearch}
                      onChange={(event) => setPlacementSearch(event.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <select
                      className="form-select form-select-sm"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      {STATUS_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 d-flex align-items-center">
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="ads-live-only"
                        checked={liveOnly}
                        onChange={(event) => setLiveOnly(event.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="ads-live-only">Live only</label>
                    </div>
                  </div>
                </div>
                <p className="small text-muted mb-2">
                  Showing {filteredPlacements.length} of {snapshot?.placements.length ?? 0} placements.
                  Click a row to open reporting for that advertiser.
                </p>
                {filteredPlacements.length ? (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle ads-placements-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Advertiser</th>
                          <th>Campaign</th>
                          <th className="d-none d-lg-table-cell">Season</th>
                          <th>Loads / clicks</th>
                          <th className="d-none d-md-table-cell">Go-live</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlacements.map((row) => (
                          <tr
                            key={row.id}
                            className={`ads-placements-table__row ${row.is_live ? '' : 'table-light'} ${selectedAdvertiserId === row.advertiser_id ? 'is-selected' : ''}`}
                            onClick={() => handlePlacementRowClick(row.advertiser_id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handlePlacementRowClick(row.advertiser_id);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`View ${row.advertiser_name} reporting`}
                          >
                            <td>
                              <span className={`badge ${statusBadgeClass(row.status, row.is_live)} text-uppercase`}>
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td>{row.advertiser_name}</td>
                            <td>
                              <div>{row.campaign_name}</div>
                              <div className="small text-muted">{row.creative_title}</div>
                            </td>
                            <td className="d-none d-lg-table-cell">
                              <div className="small">{row.season_label}</div>
                              <div className="small text-muted">{row.episode_scope}</div>
                            </td>
                            <td>{row.billboard_loads} / {row.clicks}</td>
                            <td className="d-none d-md-table-cell">
                              <GoLiveChecks checks={row.go_live} compact />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">No placements match your filters.</p>
                )}
              </div>
            </div>
          )}

          {!tabNeedsAdvertiser && activeTab === 'advertiser' && selectedAdvertiserId && (
            <div className="my-studio__dashboard">
              <div className="my-studio__panel">
                <div className="my-studio__panelHead">
                  <h2 className="my-studio__panelTitle">
                    <i className="fas fa-chart-line" aria-hidden />
                    <span className="my-studio__panelTitleText">
                      {selectedAdvertiser?.business_name || 'Advertiser'} performance
                    </span>
                  </h2>
                </div>
                <div className="my-studio__panelBody">
                  <div className="row text-center mb-3">
                    <div className="col-4">
                      <div className="my-studio__statNum">{advertiserTotals?.billboard_loads ?? 0}</div>
                      <div className="my-studio__statLabel">Billboard loads</div>
                    </div>
                    <div className="col-4">
                      <div className="my-studio__statNum">{advertiserTotals?.clicks ?? 0}</div>
                      <div className="my-studio__statLabel">Clicks</div>
                    </div>
                    <div className="col-4">
                      <div className="my-studio__statNum">{advertiserTotals?.ctr ?? 0}%</div>
                      <div className="my-studio__statLabel">CTR</div>
                    </div>
                  </div>
                  <p className="my-studio__studioDesc small text-muted">
                    Billboard loads count when a creative is applied to the in-scene billboard mesh.
                  </p>
                  <h3 className="product-landing__h3">Campaigns</h3>
                  {report?.advertiser.campaigns.length ? (
                    <div className="list-group mb-4">
                      {report.advertiser.campaigns.map((campaign) => (
                        <div className="list-group-item" key={campaign.id}>
                          <div className="fw-bold">{campaign.name}</div>
                          <div className="small text-muted">
                            {campaign.billboard_loads} loads · {campaign.clicks} clicks · {campaign.ctr}% CTR
                            {campaign.budget_label ? ` · ${campaign.budget_label}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No campaign reach yet.</p>
                  )}
                  {blockedPlacements.length ? (
                    <>
                      <h3 className="product-landing__h3">Needs attention ({blockedPlacements.length})</h3>
                      <div className="list-group">
                        {blockedPlacements.map((placement) => (
                          <div className="list-group-item" key={placement.id}>
                            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-2">
                              <div>
                                <div className="fw-bold">{placement.campaign_name}</div>
                                <div className="small text-muted">{placement.creative_title}</div>
                              </div>
                              <span className={`badge ${statusBadgeClass(placement.status, placement.is_live)} text-uppercase`}>
                                {statusLabel(placement.status)}
                              </span>
                            </div>
                            <GoLiveChecks checks={placement.go_live} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-success small mb-0">All placements for this advertiser are live.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!tabNeedsAdvertiser && activeTab === 'setup' && selectedAdvertiserId && (
            <>
              <div className="my-studio__dashboard">
                <div className="my-studio__panel">
                  <div className="my-studio__panelHead">
                    <h2 className="my-studio__panelTitle">
                      <i className="fas fa-bullhorn" aria-hidden />
                      <span className="my-studio__panelTitleText">Create campaign</span>
                    </h2>
                  </div>
                  <div className="my-studio__panelBody">
                    <form onSubmit={createCampaign}>
                      <div className="mb-3">
                        <label className="form-label">Campaign name</label>
                        <input className="form-control" required value={campaignForm.name} onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })} />
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Start date</label>
                          <input className="form-control" type="date" value={campaignForm.start_date} onChange={(event) => setCampaignForm({ ...campaignForm, start_date: event.target.value })} />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">End date</label>
                          <input className="form-control" type="date" value={campaignForm.end_date} onChange={(event) => setCampaignForm({ ...campaignForm, end_date: event.target.value })} />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Budget / package note</label>
                        <input className="form-control" value={campaignForm.budget_label} onChange={(event) => setCampaignForm({ ...campaignForm, budget_label: event.target.value })} />
                      </div>
                      <button className="product-landing__ctaPrimary" type="submit" disabled={isSaving}>
                        Create campaign
                      </button>
                    </form>
                  </div>
                </div>

                <div className="my-studio__panel">
                  <div className="my-studio__panelHead">
                    <h2 className="my-studio__panelTitle">
                      <i className="fas fa-image" aria-hidden />
                      <span className="my-studio__panelTitleText">Submit creative</span>
                    </h2>
                  </div>
                  <div className="my-studio__panelBody">
                    <form onSubmit={submitCreative}>
                      <div className="mb-3">
                        <label className="form-label">Campaign</label>
                        <select className="form-select" value={creativeForm.campaign} onChange={(event) => setCreativeForm({ ...creativeForm, campaign: event.target.value })}>
                          <option value="">No campaign</option>
                          {campaigns.map((campaign) => (
                            <option value={campaign.id} key={campaign.id}>{campaign.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Creative title</label>
                        <input className="form-control" required value={creativeForm.title} onChange={(event) => setCreativeForm({ ...creativeForm, title: event.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Destination URL</label>
                        <input className="form-control" type="text" inputMode="url" placeholder="www.example.com" required value={creativeForm.destination_url} onBlur={() => setCreativeForm({ ...creativeForm, destination_url: normalizeUrlInput(creativeForm.destination_url) })} onChange={(event) => setCreativeForm({ ...creativeForm, destination_url: event.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Image</label>
                        <input className="form-control" type="file" accept="image/*" required onChange={(event) => setCreativeForm({ ...creativeForm, image: event.target.files?.[0] || null })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Alt text</label>
                        <input className="form-control" value={creativeForm.alt_text} onChange={(event) => setCreativeForm({ ...creativeForm, alt_text: event.target.value })} />
                      </div>
                      <button className="product-landing__ctaPrimary" type="submit" disabled={isSaving}>
                        Submit creative
                      </button>
                    </form>
                    {creatives.length > 0 && (
                      <div className="mt-4">
                        <h3 className="product-landing__h3">Creatives</h3>
                        <div className="list-group">
                          {creatives.map((creative) => (
                            <div className="list-group-item d-flex justify-content-between align-items-center" key={creative.id}>
                              <span>{creative.title}</span>
                              <span className="badge bg-secondary text-uppercase">{creative.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <details className="ads-advanced mt-4">
                <summary className="small text-muted">Staff test profile (advanced)</summary>
                <div className="my-studio__panel mt-2">
                  <div className="my-studio__panelBody">
                    <p className="small text-muted">
                      Saves to your staff login account only — for testing the advertiser flow, not client businesses.
                    </p>
                    <form onSubmit={saveProfile}>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Business name</label>
                          <input className="form-control" required value={profileForm.business_name} onChange={(event) => setProfileForm({ ...profileForm, business_name: event.target.value })} />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Contact email</label>
                          <input className="form-control" type="email" required value={profileForm.contact_email} onChange={(event) => setProfileForm({ ...profileForm, contact_email: event.target.value })} />
                        </div>
                      </div>
                      <button className="btn btn-outline-secondary btn-sm" type="submit" disabled={isSaving}>
                        Save staff-linked profile
                      </button>
                      {staffProfile && (
                        <span className="badge bg-secondary text-uppercase ms-2">{staffProfile.status}</span>
                      )}
                    </form>
                  </div>
                </div>
              </details>
            </>
          )}

          {!tabNeedsAdvertiser && activeTab === 'billing' && selectedAdvertiserId && (
            <div className="my-studio__panel">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-file-invoice-dollar" aria-hidden />
                  <span className="my-studio__panelTitleText">Monthly invoice</span>
                </h2>
              </div>
              <div className="my-studio__panelBody">
                <p className="my-studio__studioDesc small text-muted">
                  PDF uses the same layout as store invoices. Metrics for the selected month are included in the notes.
                </p>
                <form onSubmit={generateInvoice} className="ads-invoice-form">
                  <div className="mb-3">
                    <label className="form-label">Campaign</label>
                    <select
                      className="form-select"
                      required
                      value={invoiceForm.campaign_id}
                      onChange={(event) => setInvoiceForm({ ...invoiceForm, campaign_id: event.target.value })}
                      disabled={!campaigns.length}
                    >
                      <option value="">Select campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Year</label>
                      <input className="form-control" type="number" required value={invoiceForm.year} onChange={(event) => setInvoiceForm({ ...invoiceForm, year: Number(event.target.value) })} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Month</label>
                      <input className="form-control" type="number" min={1} max={12} required value={invoiceForm.month} onChange={(event) => setInvoiceForm({ ...invoiceForm, month: Number(event.target.value) })} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Amount (USD)</label>
                      <input className="form-control" type="number" min="0.01" step="0.01" required value={invoiceForm.amount} onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes (optional)</label>
                    <textarea className="form-control" rows={2} value={invoiceForm.notes} onChange={(event) => setInvoiceForm({ ...invoiceForm, notes: event.target.value })} />
                  </div>
                  <button className="product-landing__ctaPrimary" type="submit" disabled={isSaving}>
                    Generate invoice PDF
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdvertiserDashboard;
