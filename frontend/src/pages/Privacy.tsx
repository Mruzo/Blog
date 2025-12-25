import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const Privacy: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
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
              <li>✓ <strong>Content Information:</strong> Stories, characters, dialogues, 3D models, images, and other creative content you upload</li>
              <li>✓ <strong>Collaboration Data:</strong> Information about your collaborations, studio memberships, and creative partnerships</li>
              <li>✓ <strong>Usage Analytics:</strong> How you interact with stories, view counts, engagement metrics, and platform usage patterns</li>
              <li>✓ <strong>Technical Information:</strong> IP address, browser type, device information, and cookies</li>
              <li>✓ <strong>Communication Data:</strong> Support inquiries, feedback, and correspondence</li>
              <li>✓ <strong>E-Commerce Information (if applicable):</strong> Shipping address, billing address, payment details, and purchase history</li>
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
              <li>✓ <strong>Collaborators:</strong> When you collaborate on stories, relevant information is shared with your collaborators</li>
              <li>✓ <strong>Service Providers:</strong> Who help us operate our Platform (hosting, analytics, etc.)</li>
              <li>✓ <strong>Payment Processors (if applicable):</strong> To process payments securely</li>
              <li>✓ <strong>Shipping Partners (if applicable):</strong> To deliver orders</li>
            </ul>
            <p>
              We do not sell your personal information to third parties. Your creative content remains yours, and we 
              respect your privacy and creative rights.
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
              <li>✓ Opt-out of marketing communications</li>
              <li>✓ Lodge a complaint with a supervisory authority</li>
            </ul>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;

