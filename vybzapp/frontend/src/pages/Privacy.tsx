import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useApi } from '../contexts/ApiContext';

const Privacy: React.FC = () => {
  const { currentUser } = useApi();
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container mt-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="subtext-btn mb-0 font-quicksand">Privacy Policy</h1>
        <BackButton to="/" />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <p className="text-muted small mb-4">Last updated: {currentDate}</p>

          <div className="policy-content font-quicksand">
            <p>
              This Privacy Policy describes how Justvybz Inc. ("we", "us", or "our") collects, uses, and protects
              your personal information when you use our immersive storytelling platform www.justvybz.com (the "Platform").
              Our Platform enables creators to build, share, and experience interactive 3D comic stories.
            </p>

            <h2 className="h5 mt-4 font-quicksand">Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-unstyled">
              <li>✓ <strong>Account Information:</strong> Name, email, password, and profile details when you create an account</li>
              <li>✓ <strong>Content Information:</strong> Stories, seasons, episodes, characters, dialogues, 3D models, images, audio, and other creative content you upload</li>
              <li>✓ <strong>Collaboration Data:</strong> Information about your collaborations, studio memberships, and creative partnerships</li>
              <li>✓ <strong>Usage Analytics:</strong> How you interact with stories, view counts, engagement metrics, and platform usage patterns</li>
              <li>✓ <strong>In-Scene Advertising:</strong> When you view 3D stories on our platform standard scene, we may show sponsored images on designated billboards and record billboard loads (when the ad is applied in the viewer) and clicks, using a session identifier, hashed IP, browser information, and episode context for reporting and fraud prevention</li>
              <li>✓ <strong>Comments and Public Interactions:</strong> Comments you post on published stories, seasons, or episodes, including the related episode and timestamp</li>
              <li>✓ <strong>Technical Information:</strong> IP address, browser type, device information, and cookies</li>
              <li>✓ <strong>Communication Data:</strong> Support inquiries, feedback, and correspondence</li>
              <li>✓ <strong>E-Commerce Information (if applicable):</strong> Shipping address, billing address, payment details, and purchase history</li>
              <li>✓ <strong>Payment Processing:</strong> Stripe processes card payments; we receive transaction IDs and order status, not full card numbers</li>
              <li>✓ <strong>Authentication Data:</strong> Login tokens stored in your browser (see our <Link to="/cookies/">Cookie Policy</Link>)</li>
              <li>✓ <strong>Support Tickets:</strong> Information you submit through contact forms, feedback, or support requests</li>
            </ul>

            <h2 className="h5 mt-4 font-quicksand">How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-unstyled">
              <li>✓ Enable you to create, publish, and share immersive 3D stories</li>
              <li>✓ Facilitate collaboration between creators and manage studio memberships</li>
              <li>✓ Provide personalized story recommendations and improve your storytelling experience</li>
              <li>✓ Manage your account and provide customer support</li>
              <li>✓ Analyze platform usage to enhance our storytelling tools and features</li>
              <li>✓ Serve and measure in-scene advertising on platform standard 3D scenes</li>
              <li>✓ Calculate creator and advertiser reporting and revenue share</li>
              <li>✓ Send story updates, collaboration invitations, and platform notifications</li>
              <li>✓ Process and fulfill product orders (if applicable)</li>
              <li>✓ Detect and prevent fraud and abuse</li>
              <li>✓ Send marketing communications about new features and storytelling opportunities (with your consent)</li>
            </ul>

            <h2 className="h5 mt-4 font-quicksand">Information Sharing</h2>
            <p>
              We do not sell your personal information. We share information only as described below, and only as
              needed to operate the Platform, fulfill orders, or when you choose to share content yourself.
            </p>
            <p>We share your information with:</p>
            <ul className="list-unstyled">
              <li>✓ <strong>Other Users:</strong> When you publish stories publicly, your username and story content are visible to other users</li>
              <li>✓ <strong>Public Comments:</strong> Comments you post on public story pages may be visible to other users and public visitors with an episode prefix such as E1 or E2</li>
              <li>✓ <strong>Collaborators:</strong> When you collaborate on stories, relevant information is shared with your collaborators</li>
              <li>✓ <strong>Stripe:</strong> Payment processor for store checkout, refunds, and related tax calculation. Stripe receives payment and order details needed to process the transaction; we receive transaction IDs and order status, not full card numbers. See Stripe&apos;s privacy policy for how they handle payment data</li>
              <li>✓ <strong>Canada Post:</strong> Shipping partner for product orders. We share shipping addresses and package details needed to calculate rates, create labels, and deliver or return shipments</li>
              <li>✓ <strong>Amazon Web Services (AWS):</strong> Cloud storage for Platform files (such as images, media, and static assets). Content and related account-associated files may be stored on AWS infrastructure</li>
              <li>✓ <strong>Email delivery (PapaMail):</strong> Our email hosting provider sends transactional messages such as account verification, password reset, collaboration invites, order notices, and support replies. Message content and recipient email addresses are processed to deliver those emails</li>
              <li>✓ <strong>Advertisers and Creators (aggregate only):</strong> Campaign and story performance metrics such as billboard loads and clicks — not your name or email tied to individual ad events</li>
              <li>✓ <strong>Social networks (only if you share):</strong> If you use in-app share controls, your browser opens Facebook, X (Twitter), or Reddit with the story or episode link you chose to share. Those services then process data under their own policies</li>
              <li>✓ <strong>Advertiser websites (only if you click an ad):</strong> Clicking an in-scene billboard may open an advertiser&apos;s site, which has its own privacy practices</li>
              <li>✓ <strong>Other service providers:</strong> Infrastructure helpers that load fonts, icons, or scripts in your browser (for example content delivery networks). These typically receive technical request data such as IP address, not your account password or payment card number</li>
              <li>✓ <strong>Legal and safety:</strong> When required by law, or to protect the Platform, users, or others from fraud, abuse, or security threats</li>
            </ul>
            <p>
              Your creative content remains yours. Processors listed above may change if we switch vendors; we will
              update this section when material provider changes occur.
            </p>

            <h2 className="h5 mt-4 font-quicksand">In-Scene Advertising</h2>
            <p>
              Published 3D stories that use our platform standard scene may include sponsored billboards inside the 3D
              environment. We count a billboard load when the ad creative is applied to that surface in your browser.
              These metrics are not the same as industry &quot;viewable impressions.&quot; Clicking an ad may open an
              advertiser&apos;s website, which has its own privacy practices.
            </p>

            <h2 className="h5 mt-4 font-quicksand">Content Moderation</h2>
            <p>
              If you choose to publish content publicly, we may review it to help keep the Platform safe. Public content
              may be placed in a pending review state before it appears in public browsing. We may also restrict, reject,
              or remove content that violates our Terms or community standards.
            </p>
            <p>
              If you post comments on published stories, seasons, or episodes, we collect the comment content, your
              account identifier, the related episode, and timestamps. Comments may be visible to other users or public
              visitors. Please avoid sharing personal, sensitive, or confidential information in comments. We may review,
              hide, or remove comments to prevent abuse or enforce our Terms.
            </p>
            <p className="mb-0">
              If you contact support, we may create a support ticket using the information you provide (such as your name,
              email address, and message) to respond to your request.
            </p>

            <h2 className="h5 mt-4 font-quicksand">Data Security</h2>
            <p>We implement appropriate security measures to protect your information:</p>
            <ul className="list-unstyled">
              <li>✓ SSL encryption for all data transmission</li>
              <li>✓ Secure payment processing</li>
              <li>✓ Regular security assessments</li>
              <li>✓ Limited employee access to personal data</li>
            </ul>

            <h2 className="h5 mt-4 font-quicksand">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-unstyled">
              <li>✓ Access your personal information</li>
              <li>✓ Correct inaccurate information</li>
              <li>✓ Request deletion of your information</li>
              <li>✓ Export a copy of your data in a portable format</li>
              <li>✓ Opt-out of marketing communications</li>
              <li>✓ Lodge a complaint with a supervisory authority</li>
            </ul>
            <p>
              You may exercise these rights at any time by contacting us at{' '}
              <a href="mailto:Justvybz@justvybz.com">Justvybz@justvybz.com</a>.
              If you are signed in to your account, you can also use the self-service tools in the
              Privacy &amp; Data section at the bottom of this page.
            </p>

            <h2 className="h5 mt-4 font-quicksand">GDPR (European Economic Area &amp; UK)</h2>
            <p>
              If you are in the EEA or UK, we process your data under lawful bases including contract
              (providing the Platform), legitimate interests (security and improvement), and consent
              (marketing where applicable). You have rights to access, rectification, erasure, restriction,
              portability, and objection. We respond to requests within one month where required by law.
              Order records needed for tax or accounting may be retained in anonymized form after account deletion.
              Submit requests to <a href="mailto:Justvybz@justvybz.com">Justvybz@justvybz.com</a>; signed-in account
              holders may also use the Privacy &amp; Data section below.
            </p>

            <h2 className="h5 mt-4 font-quicksand">CCPA / CPRA (California Residents)</h2>
            <p>
              We do <strong>not sell</strong> your personal information. California residents may request to know
              what categories of personal information we collect, request deletion, and opt out of any future sale
              (not applicable today). We do not discriminate against you for exercising these rights. Email{' '}
              <a href="mailto:Justvybz@justvybz.com">Justvybz@justvybz.com</a> with &quot;California Privacy Request&quot;
              in the subject line, or use the self-service tools in the Privacy &amp; Data section below when signed in.
            </p>

            <h2 className="h5 mt-4 font-quicksand">International Transfers</h2>
            <p>
              We process data in Canada and comply with applicable data protection laws. If you are located outside
              Canada, your information may be transferred to and processed in Canada.
            </p>

            <h2 className="h5 mt-4 font-quicksand">Children's Privacy</h2>
            <p>Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>

            <h2 className="h5 mt-4 font-quicksand">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of any material changes by posting
              the new Privacy Policy on this page.
            </p>

            <h2 className="h5 mt-4 font-quicksand">Contact Us</h2>
            <p>For questions about this Privacy Policy, your creative content, or our data practices:</p>
            <ul className="list-unstyled">
              <li>Email: <a href="mailto:Justvybz@justvybz.com">Justvybz@justvybz.com</a></li>
              <li>Website: <Link to="/contact/">www.justvybz.com/contact</Link></li>
            </ul>

            {currentUser && (
              <>
                <h2 className="h5 mt-4 font-quicksand">Privacy &amp; Data</h2>
                <p>
                  Download a copy of your personal data or permanently delete your account and associated content.
                  These self-service tools are available while you are signed in.
                </p>
                <Link to="/account/privacy/" className="btn btn-primary">
                  Manage my data
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
