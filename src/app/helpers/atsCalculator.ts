/**
 * Gemini AI-Powered ATS Score Calculator
 * Extracts keywords from job post and compares with applicant profile
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config';
import { IJob } from '../modules/hiring/hiring.interface';

interface ApplicantData {
  resumeText?: string; // Parsed resume content
  coverLetter?: string;
  location: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;

export const initializeGemini = () => {
  if (!genAI && config.gemini_api_key) {
    genAI = new GoogleGenerativeAI(config.gemini_api_key);
  }
  return genAI;
};

/**
 * Calculate ATS score using Gemini AI keyword extraction and comparison
 * Returns the score, job keywords, and applicant keywords
 */
export const calculateATSScore = async (
  job: IJob,
  applicant: ApplicantData
): Promise<{ score: number; keywords: string[]; applicantKeywords: string[] }> => {
  try {
    // Check if resume text is available
    if (!applicant.resumeText || applicant.resumeText.trim().length === 0) {
      console.log('⚠️  No resume text available. Resume parsing may have failed.');
      return { score: 50, keywords: [], applicantKeywords: [] }; // Default score when no resume text
    }

    const ai = initializeGemini();
    
    if (!ai) {
      console.log('⚠️  Gemini API key not configured. Using basic scoring.');
      const basicScore = calculateBasicScore(applicant);
      const basicKeywords = extractBasicKeywords(job);
      const basicApplicantKeywords = extractBasicApplicantKeywords(applicant);
      return { score: basicScore, keywords: basicKeywords, applicantKeywords: basicApplicantKeywords };
    }

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Step 1: Extract important keywords from job post
    const jobKeywords = await extractJobKeywords(model, job);
    console.log('📋 Job Keywords:', jobKeywords);

    // Step 2: Extract keywords from applicant resume
    const applicantKeywords = await extractApplicantKeywords(applicant);
    console.log('👤 Applicant Keywords:', applicantKeywords);

    if (jobKeywords.length === 0) {
      console.log('⚠️  No keywords extracted from job. Using basic extraction.');
      const basicKeywords = extractBasicKeywords(job);
      const score = await compareApplicantWithKeywords(model, basicKeywords, applicant);
      return { score, keywords: basicKeywords, applicantKeywords };
    }

    // Step 3: Compare with applicant profile
    const score = await compareApplicantWithKeywords(model, jobKeywords, applicant);
    console.log(`✨ Gemini ATS Score: ${score}%`);

    return { score, keywords: jobKeywords, applicantKeywords };
  } catch (error) {
    console.error('Error calculating ATS score with Gemini:', error);
    const basicScore = calculateBasicScore(applicant);
    const basicKeywords = extractBasicKeywords(job);
    const basicApplicantKeywords = extractBasicApplicantKeywords(applicant);
    return { score: basicScore, keywords: basicKeywords, applicantKeywords: basicApplicantKeywords };
  }
};

/**
 * Step 1: Extract important keywords from job description using Gemini
 */
const extractJobKeywords = async (
  model: any,
  job: IJob
): Promise<string[]> => {
  // Clean HTML from description
  const cleanDescription = job.description
    ? job.description
        .replace(/<[^>]*>/g, ' ')     // Remove all HTML tags
        .replace(/&nbsp;/g, ' ')      // Remove &nbsp;
        .replace(/&[a-z]+;/gi, ' ')   // Remove other HTML entities
        .replace(/[\[\]<>{}]/g, ' ')  // Remove brackets
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

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .filter((k: string) => !/<|>|\[|\]|{|}|&|<p>|<\/p>|<strong>|<\/strong>/.test(k)) // Remove HTML/brackets
      .slice(0, 25);

    if (keywords.length > 0) {
      console.log(`✅ Extracted ${keywords.length} clean job keywords using Gemini AI`);
      return keywords;
    }

    // Fallback to basic extraction
    return extractBasicKeywords(job);
  } catch (error) {
    console.error('Error extracting keywords with Gemini:', error);
    return extractBasicKeywords(job);
  }
};

/**
 * Extract applicant keywords from resume using Gemini AI
 */
export const extractApplicantKeywords = async (
  applicant: ApplicantData
): Promise<string[]> => {
  try {
    const ai = initializeGemini();
    if (!ai || !applicant.resumeText) {
      return extractBasicApplicantKeywords(applicant);
    }

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Clean the resume text from any HTML or special characters
    const cleanResumeText = applicant.resumeText
      .replace(/<[^>]*>/g, ' ')         // Remove HTML tags
      .replace(/&nbsp;/g, ' ')          // Remove &nbsp;
      .replace(/&[a-z]+;/gi, ' ')       // Remove HTML entities
      .replace(/[\[\]<>{}]/g, ' ')      // Remove brackets
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .trim();

    const prompt = `
You are a technical recruiter analyzing a candidate's resume. Extract ONLY technical skills, tools, and technologies.

INCLUDE ONLY:
- Programming languages (JavaScript, Python, Java, C++, etc.)
- Frameworks & libraries (React, Node.js, Express, Django, Spring, etc.)
- Databases (MongoDB, PostgreSQL, MySQL, Redis, etc.)
- Tools & platforms (Git, Docker, AWS, Jenkins, Kubernetes, etc.)
- Technical concepts (REST API, GraphQL, Microservices, CI/CD, etc.)
- Certifications (AWS Certified, Google Cloud, etc.)
- Degrees (Bachelor's in CS, Master's in Engineering, etc.)
- Years of experience (e.g., "3 years", "5+ years experience")

DO NOT INCLUDE:
- Names, emails, phone numbers, addresses
- URLs, LinkedIn, GitHub usernames
- Cities, countries, locations
- Generic words (passionate, enthusiastic, detail-oriented, etc.)
- Soft skills (communication, teamwork, leadership, etc.)
- Company names or job titles
- Dates, months, years without context

Resume Content:
${cleanResumeText.substring(0, 2000)}

Return ONLY a comma-separated list of technical skills and qualifications.
Example: JavaScript, React.js, Node.js, Express.js, MongoDB, REST API, Git, HTML, CSS, Bootstrap, JWT, 2 years experience`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean the extracted keywords
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .filter((k: string) => !/<|>|\[|\]|{|}|&/.test(k)) // Remove any remaining HTML/brackets
      .slice(0, 25);

    if (keywords.length > 0) {
      console.log(`✅ Extracted ${keywords.length} keywords from applicant resume using Gemini AI`);
      return keywords;
    }

    return extractBasicApplicantKeywords(applicant);
  } catch (error) {
    console.error('Error extracting applicant keywords with Gemini:', error);
    return extractBasicApplicantKeywords(applicant);
  }
};

/**
 * Fallback: Extract basic keywords from applicant resume
 */
const extractBasicApplicantKeywords = (applicant: ApplicantData): string[] => {
  const resumeText = applicant.resumeText || '';
  
  // Clean text thoroughly
  const cleanText = resumeText
    .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')            // Remove &nbsp;
    .replace(/&[a-z]+;/gi, ' ')         // Remove HTML entities
    .replace(/[\[\]<>{}]/g, ' ')        // Remove brackets
    .replace(/https?:\/\/[^\s]+/gi, '') // Remove URLs
    .replace(/www\.[^\s]+/gi, '')       // Remove www URLs
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '') // Remove emails
    .replace(/\+?[\d\s()-]{7,}/g, '')   // Remove phone numbers
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
  
  // Common technical keywords to look for
  const technicalKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
    'react', 'angular', 'vue', 'next', 'node', 'express', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'mysql', 'redis', 'firebase', 'sql',
    'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
    'api', 'rest', 'graphql', 'jwt', 'oauth', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'redux', 'jest', 'webpack', 'babel', 'npm', 'yarn',
    'bachelor', 'master', 'degree', 'certification', 'certified'
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
  
  // If we found technical keywords, return them
  if (foundKeywords.length > 0) {
    console.log(`✅ Extracted ${foundKeywords.length} technical keywords using basic fallback`);
    return [...new Set(foundKeywords)].slice(0, 20);
  }
  
  // Last resort: extract capitalized words (likely to be technologies)
  const words = cleanText.split(/[\s,;.():]+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => /^[A-Z]/.test(word)) // Starts with capital letter
    .filter((word: string) => !/^(The|And|For|With|From|About|Objective|Enthusiastic)$/i.test(word)); // Exclude common words
  
  return [...new Set(words)].slice(0, 20);
};

/**
 * Step 2: Compare applicant resume with extracted keywords using Gemini
 */
export const compareApplicantWithKeywords = async (
  model: any,
  keywords: string[],
  applicant: ApplicantData
): Promise<number> => {
  const resumeContent = applicant.resumeText || '';
  const coverLetterContent = applicant.coverLetter || '';
  
  const prompt = `
You are an ATS (Applicant Tracking System) evaluator. Compare this applicant's resume with the job keywords and give a match score from 0-100.

Job Keywords (extracted from job description):
${keywords.map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}

Applicant Resume Content:
${resumeContent.substring(0, 2000)}

${coverLetterContent ? `Cover Letter:\n${coverLetterContent.substring(0, 500)}` : ''}

Evaluate the match based on:
1. How many keywords appear in the resume
2. Relevance of skills and experience
3. Technical skills match
4. Overall keyword coverage

Return ONLY a number between 0-100 representing the ATS match score. No explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const score = parseInt(text.trim());
    
    if (isNaN(score) || score < 0 || score > 100) {
      console.log('⚠️  Invalid Gemini score. Using fallback comparison.');
      return compareKeywordsBasic(keywords, applicant);
    }
    
    return score;
  } catch (error) {
    console.error('Error comparing with Gemini:', error);
    return compareKeywordsBasic(keywords, applicant);
  }
};

/**
 * Fallback: Extract keywords from job description using basic patterns
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

/**
 * Fallback: Basic keyword comparison with resume
 */
const compareKeywordsBasic = (keywords: string[], applicant: ApplicantData): number => {
  try {
    let matchCount = 0;
    const totalKeywords = keywords.length;

    if (totalKeywords === 0) {
      return calculateBasicScore(applicant);
    }

    const applicantText = `
      ${applicant.resumeText || ''}
      ${applicant.coverLetter || ''}
    `.toLowerCase();

    keywords.forEach(keyword => {
      if (applicantText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });

    const matchPercentage = (matchCount / totalKeywords) * 100;
    return Math.round(matchPercentage);
  } catch (error) {
    console.error('Error in basic comparison:', error);
    return calculateBasicScore(applicant);
  }
};

/**
 * Calculate basic score as ultimate fallback based on resume content
 */
const calculateBasicScore = (applicant: ApplicantData): number => {
  let score = 40; // Base score

  const resumeText = (applicant.resumeText || '').toLowerCase();
  const coverLetter = (applicant.coverLetter || '').toLowerCase();

  // Resume length bonus (indicates more detailed profile)
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount > 500) {
    score += 20;
  } else if (wordCount > 200) {
    score += 15;
  } else if (wordCount > 100) {
    score += 10;
  }

  // Cover letter bonus
  if (coverLetter.length > 100) {
    score += 10;
  }

  // Common keywords bonus
  const commonKeywords = ['experience', 'years', 'skills', 'bachelor', 'master', 'project', 'team', 'development'];
  const keywordMatches = commonKeywords.filter(keyword => resumeText.includes(keyword)).length;
  score += Math.min(keywordMatches * 3, 20);

  return Math.min(Math.round(score), 100);
};

export default calculateATSScore;
