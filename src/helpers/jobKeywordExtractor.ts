/**
 * Job Keyword Extractor - Uses Gemini AI to extract keywords from job description
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';
import { IJob } from '../app/modules/hiring/hiring.interface';

/**
 * Extract keywords from job description using Gemini AI
 */
export const extractJobKeywords = async (job: IJob): Promise<string[]> => {
  try {
    if (!config.gemini_api_key) {
      console.log('⚠️  Gemini API key not configured. Skipping keyword extraction.');
      return extractBasicKeywords(job);
    }

    const genAI = new GoogleGenerativeAI(config.gemini_api_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Clean HTML from description
    const cleanDescription = job.description
      ? job.description
          .replace(/<[^>]*>/g, ' ')     // Remove all HTML tags
          .replace(/&nbsp;/g, ' ')      // Remove &nbsp;
          .replace(/&[a-z]+;/gi, ' ')   // Remove other HTML entities
          .replace(/\s+/g, ' ')         // Normalize whitespace
          .trim()
      : 'Not provided';

    const prompt = `
You are a technical recruiter. Extract ONLY technical skills, tools, and technologies from this job description.

INCLUDE ONLY:
- Programming languages (JavaScript, Python, Java, etc.)
- Frameworks & libraries (React, Node.js, Express, Angular, etc.)
- Databases (MongoDB, PostgreSQL, MySQL, Redis, etc.)
- Tools & platforms (Git, Docker, AWS, Firebase, etc.)
- Technical concepts (REST API, GraphQL, CI/CD, Agile, etc.)
- Specific years of experience (e.g., "3+ years", "5 years experience")
- Required degrees (Bachelor's, Master's, etc.)

DO NOT INCLUDE:
- Job titles (Junior, Senior, Developer, Engineer, etc.)
- Generic words (passionate, team, looking, join, etc.)
- Locations, employment types, or company info
- Action verbs (build, develop, work, collaborate, etc.)
- Soft skills (communication, teamwork, leadership, etc.)

Job Description:
${cleanDescription}

Return ONLY a comma-separated list of technical keywords.
Example: JavaScript, React.js, Node.js, Express.js, MongoDB, REST API, Git, Redux, TypeScript, 0-1 years`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .slice(0, 25);

    if (keywords.length > 0) {
      console.log(`✅ Extracted ${keywords.length} keywords from job using Gemini AI`);
      return keywords;
    }

    return extractBasicKeywords(job);
  } catch (error) {
    console.error('Error extracting job keywords with Gemini:', error);
    return extractBasicKeywords(job);
  }
};

/**
 * Fallback: Basic keyword extraction from job description
 */
const extractBasicKeywords = (job: IJob): string[] => {
  const description = job.description || '';
  
  // Clean text thoroughly
  const cleanText = description
    .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')            // Remove &nbsp;
    .replace(/&[a-z]+;/gi, ' ')         // Remove HTML entities
    .replace(/[\[\]<>{}]/g, ' ')        // Remove brackets
    .replace(/🚀|📍|🕒|💼|[^\x00-\x7F]/g, ' ') // Remove emojis and non-ASCII
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
  
  // Common technical keywords to look for
  const technicalKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
    'react', 'angular', 'vue', 'next', 'node', 'express', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'mysql', 'redis', 'firebase', 'sql',
    'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
    'api', 'rest', 'graphql', 'jwt', 'oauth', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'redux', 'jest', 'webpack', 'babel', 'npm', 'yarn'
  ];
  
  const foundKeywords: string[] = [];
  const lowerText = cleanText.toLowerCase();
  
  // Find technical keywords in the text
  for (const keyword of technicalKeywords) {
    if (lowerText.includes(keyword)) {
      // Find the actual casing from the original text
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const match = cleanText.match(regex);
      if (match && match[0]) {
        foundKeywords.push(match[0]);
      }
    }
  }
  
  // Look for experience requirements (e.g., "3+ years", "5 years experience")
  const experienceMatch = cleanText.match(/\d+[\s]*[-+]?[\s]*years?/gi);
  if (experienceMatch) {
    foundKeywords.push(...experienceMatch);
  }
  
  // Look for degree requirements
  const degreeMatch = cleanText.match(/\b(bachelor'?s?|master'?s?|phd|doctorate)\b/gi);
  if (degreeMatch) {
    foundKeywords.push(...degreeMatch);
  }
  
  if (foundKeywords.length > 0) {
    console.log(`✅ Extracted ${foundKeywords.length} technical keywords using basic fallback`);
    return [...new Set(foundKeywords)].slice(0, 20);
  }
  
  // Last resort: extract capitalized words (likely to be technologies)
  const words = cleanText.split(/[\s,;.():]+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => /^[A-Z]/.test(word)) // Starts with capital letter
    .filter((word: string) => !/^(The|And|For|With|From|About|Role|Join|Looking|We|Are|You|Will|Can|Must|Should|Have)$/i.test(word));
  
  return [...new Set(words)].slice(0, 20);
};

export default extractJobKeywords;
