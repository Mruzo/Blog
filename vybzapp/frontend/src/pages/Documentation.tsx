import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import MetaTags from '../components/MetaTags';

const Documentation: React.FC = () => {
  return (
    <div className="container mt-4" style={{ maxWidth: '900px' }}>
      <MetaTags
        title="Documentation | JustVybz"
        description="How to watch, create, and direct immersive 3D comic stories on JustVybz."
        keywords="JustVybz documentation, 3D comics help, story creation, camera controls"
      />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="subtext-btn mb-0 font-quicksand">Documentation</h1>
        <BackButton to="/" />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="policy-content font-quicksand">
            <p className="lead mb-4">
              JustVybz is a studio for immersive 3D comic stories. Readers move through dialogue
              in a shared 3D scene. Creators write the script and direct the camera without drawing.
            </p>

            <nav className="mb-4" aria-label="Documentation sections">
              <p className="text-muted small mb-2">On this page</p>
              <ul className="list-unstyled mb-0">
                <li><a href="#watching">Watching a story</a></li>
                <li><a href="#creating">Creating a story</a></li>
                <li><a href="#camera">Directing the camera</a></li>
                <li><a href="#studio">Studios and My Studio</a></li>
                <li><a href="#collaborators">Collaborators</a></li>
                <li><a href="#store">Store and orders</a></li>
                <li><a href="#account">Account</a></li>
              </ul>
            </nav>

            <h2 id="watching" className="h4 mt-5 mb-3 font-quicksand">Watching a story</h2>
            <ol>
              <li>
                Open <Link to="/immersivecomics/">Stories</Link> and choose a published story.
              </li>
              <li>Select an episode, then tap Start to load the 3D scene.</li>
              <li>
                Read the episode description, then use Next to move through each dialogue
                line. Previous goes back one line. Play steps through lines automatically.
              </li>
              <li>
                Use Fullscreen to hide the rest of the page while you watch. On a phone it
                fills the screen. On a computer it opens a tall, phone-shaped window. Leave
                with the same Fullscreen control. On a computer you can also press Escape or
                click the dimmed area around the window.
              </li>
            </ol>
            <p>
              Each line can move the camera to a new angle. Character names in the scene stay
              attached to the 3D model and hide when something in the scene is in front of them.
            </p>

            <h2 id="creating" className="h4 mt-5 mb-3 font-quicksand">Creating a story</h2>
            <p>
              Sign in, then open <Link to="/immersivecomics/my-studio/">My Studio</Link> and start
              a new story. The wizard walks through:
            </p>
            <ul>
              <li>
                <strong>Title &amp; description</strong> — name the story and write a short summary.
              </li>
              <li>
                <strong>Characters</strong> — add the people who speak. Place each character in a
                scene slot so their label sits on the 3D model.
              </li>
              <li>
                <strong>Season and episode</strong> — group episodes in a season. Episodes use the
                shared JustVybz 3D scene.
              </li>
              <li>
                <strong>Dialogues</strong> — write the script in order. Each line belongs to a
                character and can have its own camera framing.
              </li>
              <li>
                <strong>Preview</strong> — play the episode and adjust cameras before you publish.
              </li>
              <li>
                <strong>Publish</strong> — make the story public, or keep it as a private draft.
              </li>
            </ul>
            <p>
              After the wizard, Manage Story is where you pick episodes, preview the 3D scene, and
              keep editing cameras. Add people to your studio first, then assign them to a story.
            </p>

            <h2 id="camera" className="h4 mt-5 mb-3 font-quicksand">Directing the camera</h2>
            <p>
              In Preview, switch to Edit Mode to open the camera dials. Choose a value (Azimuth,
              Polar, Radius, or Target X / Y / Z), then move the slider. The 3D view updates live.
            </p>
            <ul>
              <li>
                <strong>Orbit (Az, Pol, Rad)</strong> — rotate around the scene and change how
                close the camera sits.
              </li>
              <li>
                <strong>Target (X, Y, Z)</strong> — aim the camera at a point in the scene, such as
                a character.
              </li>
            </ul>
            <p>
              Use Next and Previous to pick the dialogue line you are editing, then Save. Save
              stores the camera for that line only. Reset restores the last saved values for the
              line on screen. The numbers under the slider are last saved, not the live preview.
            </p>

            <h2 id="studio" className="h4 mt-5 mb-3 font-quicksand">Studios and My Studio</h2>
            <p>
              <Link to="/immersivecomics/studios/">Studios</Link> lists public creator studios.{' '}
              <Link to="/immersivecomics/my-studio/">My Studio</Link> is your workspace: stories,
              drafts, studio details, and your team.
            </p>

            <h2 id="collaborators" className="h4 mt-5 mb-3 font-quicksand">Collaborators</h2>
            <p>
              People join your <strong>studio</strong> first. After that, you choose which
              teammates work on each <strong>story</strong>.
            </p>
            <h3 className="h5 mt-4 mb-2 font-quicksand">Invite to your studio</h3>
            <p>
              On <Link to="/immersivecomics/my-studio/">My Studio</Link>, open Invite in the team
              panel. Choose a role, then:
            </p>
            <ul>
              <li>
                Search for a registered username and select them. They are added to the team
                immediately.
              </li>
              <li>
                If they do not have an account, send an email invite. They get a registration
                link. After they register with that email, they join the studio.
              </li>
            </ul>
            <p>
              Roles are writer, screenwriter, director, 3D artist, voice actor, sound engineer,
              and cinematographer. You can hold extra roles yourself and remove those extra
              roles later. Your own extra roles show as Me. Other teammates still appear as
              their username.
            </p>
            <p>
              In the team panel, tap a name (or Me) to open that person&apos;s public studio
              page.
            </p>
            <h3 className="h5 mt-4 mb-2 font-quicksand">Assign teammates to a story</h3>
            <p>
              On the story collaborators page, pick which studio teammates work on that story
              and toggle their roles. If the list is empty, invite them to the studio first.
            </p>

            <h2 id="store" className="h4 mt-5 mb-3 font-quicksand">Store and orders</h2>
            <p>
              The <Link to="/product/">Store</Link> sells related products. Add items to the cart
              and check out as a guest or while signed in. Signed-in buyers can review purchases
              under My Orders.
            </p>

            <h2 id="account" className="h4 mt-5 mb-3 font-quicksand">Account</h2>
            <p>
              Create an account from <Link to="/register/">Register</Link> if you want to publish
              stories or keep order history. You can read public stories without signing in.
            </p>
            <p>
              Questions that this page does not cover can go to{' '}
              <Link to="/contact/">Contact us</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
