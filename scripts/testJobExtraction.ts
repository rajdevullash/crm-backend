import extractJobKeywords from '../src/helpers/jobKeywordExtractor';
import { IJob } from '../src/app/modules/hiring/hiring.interface';

(async () => {
  const sampleJob: IJob = {
    title: 'Full Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    salary: 'Competitive',
    vacancy: 1,
    description: `<h1>Full Stack Developer</h1>
      <p>We are looking for a Full Stack Developer with 3+ years of experience in building web applications.</p>
      <ul>
        <li>Required: JavaScript, TypeScript, React, Node.js, Express, MongoDB</li>
        <li>Familiarity with Docker, AWS, CI/CD and REST API design</li>
        <li>Nice to have: GraphQL, Redis, Jest</li>
      </ul>
      <p>Apply now!</p>`,
    status: 'active',
    postedBy: { id: 'u1', name: 'Alice', role: 'recruiter' },
    postedDate: new Date(),
  };

  try {
    console.log('Running job keyword extraction test...');
    const keywords = await extractJobKeywords(sampleJob as any);
    console.log('Extracted keywords:', keywords);
    console.log('Count:', keywords.length);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
