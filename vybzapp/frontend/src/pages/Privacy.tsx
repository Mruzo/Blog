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
              <li>✓ Send story updates, collaboration invitations, and platform notifications</li>
              <li>✓ Process and fulfill product orders (if applicable)</li>
              <li>✓ Detect and prevent fraud and abuse</li>
              <li>✓ Send marketing communications about new features and storytelling opportunities (with your consent)</li>
            </ul>

            <h2 className="h5 mt-4 font-quicksand">Information Sharing</h2>
            <p>We share your information with:</p>
            <ul className="list-unstyled">
              <li>✓ <strong>Other Users:</strong> When you publish stories publicly, your username and story content are visible to other users</li>
              <li>✓ <strong>Public Comments:</strong> Comments you post on public story pages may be visible to other users and public visitors with an episode prefix such as E1 or E2</li>
              <li>✓ <strong>Collaborators:</strong> When you collaborate on stories, relevant information is shared with your collaborators</li>
              <li>✓ <strong>Service Providers:</strong> Who help us operate our Platform (hosting, analytics, etc.)</li>
              <li>✓ <strong>Payment Processors (if applicable):</strong> To process payments securely</li>
              <li>✓ <strong>Shipping Partners (if applicable):</strong> To deliver orders</li>
            </ul>
            <p>
              We do not sell your personal information to third parties. Your creative content remains yours, and we
              respect your privacy and creative rights.
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
