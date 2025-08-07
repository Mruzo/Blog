# User Data Storage Explanation

## 📊 What Data is Being Stored

The tracking system collects the following user data for analytics purposes:

### 🔍 **Share Button Tracking Data**

**File**: `tilf/logs/share_clicks_[environment].json`

**Data Collected Per Share Click:**
```json
{
  "timestamp": "2025-08-06T23:17:20.768669",     // When the share happened
  "environment": "development",                    // Dev or production
  "platform": "facebook",                         // Which platform (facebook, x_twitter, linkedin, reddit, copy_link)
  "episode_id": 1,                               // Which episode was shared
  "ip_address": "127.0.0.1",                     // User's IP address
  "user_agent": "Mozilla/5.0 (iPhone...)",      // Browser/device info
  "referrer": "http://127.0.0.1:8000/...",      // Page they came from
  "host": "127.0.0.1:8000"                      // Your domain
}
```

### 🌐 **Traffic Source Tracking Data**

**File**: `tilf/logs/traffic_sources_[environment].json`

**Data Collected Per Page View:**
```json
{
  "timestamp": "2025-08-06T22:39:34.750127",    // When they visited
  "environment": "development",                   // Dev or production
  "episode_id": 1,                              // Which episode they viewed
  "episode_title": "What?!",                    // Episode title
  "season_id": 1,                               // Season ID
  "season_title": "Awakening",                  // Season title
  "source": "referral",                         // How they found you (direct, search, social, referral)
  "platform": "127.0.0.1:8000",                // Specific platform (Google, Facebook, etc.)
  "referrer": "http://127.0.0.1:8000/...",     // Full referrer URL
  "user_agent": "Mozilla/5.0 (iPhone...)",     // Browser/device info
  "ip_address": "127.0.0.1",                   // User's IP address
  "host": "127.0.0.1:8000"                     // Your domain
}
```

## 🛡️ **Privacy & Data Protection**

### ✅ **What We DON'T Store:**
- **Personal Names**: No names, emails, or personal identifiers
- **Account Information**: No login credentials or account details
- **Content**: No actual episode content or dialogue
- **Comments**: Comment data is stored separately in Django models
- **Session Data**: No session cookies or persistent tracking

### ✅ **What We DO Store:**
- **Technical Data**: IP addresses, user agents, timestamps
- **Analytics Data**: Which episodes are popular, traffic sources
- **Engagement Data**: Which share buttons are clicked most
- **Geographic Data**: Basic location from IP (country/city level)

## 📈 **Data Usage & Purpose**

### **Analytics Dashboard:**
- **Traffic Sources**: See where visitors come from
- **Popular Episodes**: Identify most-viewed content
- **Share Analytics**: Track social media engagement
- **Platform Performance**: Compare Facebook vs Twitter vs LinkedIn

### **Business Intelligence:**
- **Content Strategy**: Which episodes perform best
- **Marketing Insights**: Which platforms drive traffic
- **User Behavior**: How users interact with episodes
- **Growth Tracking**: Monitor site popularity over time

## 🔒 **Data Security**

### **Storage Location:**
- **Local Files**: Data stored in your app's `tilf/logs/` directory
- **No External Services**: No third-party analytics or tracking
- **No Database**: File-based storage, no database required
- **Environment Separation**: Dev and production data separated

### **Access Control:**
- **Admin Only**: Analytics dashboard requires admin login
- **Local Access**: Files only accessible on your server
- **No Public Access**: Log files not publicly accessible
- **Backup Control**: You control backup and retention

## 📊 **Data Retention**

### **Current Policy:**
- **No Automatic Deletion**: Files grow until manually managed
- **File Size Monitoring**: Dashboard shows when files get large
- **Manual Cleanup**: You decide when to archive/delete
- **Environment Separation**: Dev data doesn't affect production stats

### **Recommended Practices:**
- **Monitor Monthly**: Check file sizes in analytics dashboard
- **Archive Quarterly**: Move old files to backup storage
- **Rotate at 10MB**: Consider log rotation for high-traffic sites
- **Keep Production**: Retain production data for business insights

## 🎯 **Data Minimization**

### **Essential Data Only:**
- **IP Address**: For unique user counting and basic geo-location
- **User Agent**: For device/browser analytics
- **Referrer**: For traffic source analysis
- **Timestamp**: For time-based analytics
- **Episode ID**: For content performance tracking

### **No Personal Data:**
- **No Names**: We don't know who you are
- **No Emails**: No contact information stored
- **No Addresses**: No physical location beyond IP
- **No Phone Numbers**: No personal contact details
- **No Social Media Profiles**: No linked accounts

## 📋 **GDPR Compliance**

### **Data Controller:**
- **You Control**: You own and control all data
- **Local Storage**: Data stays on your servers
- **No Third Parties**: No external data sharing
- **User Consent**: Standard web analytics (no special consent needed)

### **User Rights:**
- **Access**: Users can request their data (IP-based lookup)
- **Deletion**: You can delete specific IP data if requested
- **Portability**: Data can be exported in JSON format
- **Transparency**: This document explains what's collected

## 🔧 **Technical Implementation**

### **File Structure:**
```
tilf/logs/
├── share_clicks_development.json     # Dev share data
├── share_clicks_production.json      # Prod share data
├── traffic_sources_development.json  # Dev traffic data
└── traffic_sources_production.json   # Prod traffic data
```

### **Data Format:**
- **JSON**: Human-readable, easy to process
- **UTF-8**: Supports international characters
- **No Encryption**: Standard text files
- **No Compression**: Raw data for easy access

## 📈 **Analytics Benefits**

### **For Content Creators:**
- **Episode Performance**: See which episodes are most popular
- **Audience Insights**: Understand your visitor demographics
- **Traffic Sources**: Know where your audience comes from
- **Engagement Metrics**: Track social sharing behavior

### **For Business Decisions:**
- **Marketing ROI**: Measure social media campaign effectiveness
- **Content Strategy**: Plan future episodes based on data
- **Platform Focus**: Invest in platforms that drive traffic
- **Growth Tracking**: Monitor site popularity over time

---

**Note**: This tracking system is designed for legitimate business analytics purposes. All data collection is transparent, minimal, and under your control. Users can opt out by using browser privacy features or VPNs, but the analytics will still provide valuable insights for your business.
