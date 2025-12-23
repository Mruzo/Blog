import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const About: React.FC = () => {
  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="subtext-btn mb-0">Our Story</h1>
        <BackButton to="/" />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="policy-content">
            <p>
              Hello there, I'm Christopher Uzoewulu, a Web Developer from Nigeria, currently living in Canada. 
              I write about my passionate thoughts on how we could be motivated to live better and achieve greater 
              feats as a society.
            </p>

            <p>
              My professional background is pretty diverse; I'm also a Civil Engineer, Certified Associate in 
              Project Management, Certified Quality Technician, and a Data Quality Administrator. Because I love 
              to learn new things, my career interest has taken a few turns over the past 5 years. In that time, 
              I've switched between several jobs (part time and full time), and met a tonne of wonderful people 
              that have helped me make some positive life changing decisions.
            </p>

            <p>
              I built this web app primarily as a side project to improve my Django skills, and for the most part, 
              I had no idea what kind of content to share. So I took a short trip into my past and figured I've 
              indirectly learned more about life from literally over a thousand people, and I thought this would 
              be a good platform to share my learning with you.
            </p>

            <p>
              The name of this blog, is self inspired. I figured most people (me) don't always want to listen to 
              motivational speakers talk about how/why you should "aspire to acquire the desire that you admire", 
              but deep down, you need that extra push - that inner energy to get through a project or a difficult 
              time or to recognize and appreciate your little gains. From my experience, there's no better feeling 
              than when that motivation nicely sneaks up on you.
            </p>

            <p>
              We are all in this beautiful world to help each other learn and improve in one way or the other, and 
              this is the beginning of my journey to helping you learn and improve. Please add your two cents to 
              my articles because I'd love to learn from you too, and I hope you feel my passion well enough to 
              spread the word.
            </p>

            <p>Cheers.</p>

            <div className="mt-4">
              <img 
                src="/static/snmov/img/about.png" 
                className="rounded-0 mx-0 d-block img-fluid" 
                alt="Christopher Uzoewulu" 
                style={{ width: '15%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

