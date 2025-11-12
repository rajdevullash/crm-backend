/**
 * Gemini AI-Powered ATS Score Calculator
 * Extracts keywords from job post and compares with applicant profile
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config';
import { IJob } from '../modules/hiring/hiring.interface';

interface ApplicantData {
  resumeText?: string;
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
 * Calculate ATS score using Gemini AI
 */
export const calculateATSScore = async (
  job: IJob,
  applicant: ApplicantData
): Promise<{ score: number; keywords: string[]; applicantKeywords: string[] }> => {
  try {
    if (!applicant.resumeText || applicant.resumeText.trim().length === 0) {
      console.log('⚠️  No resume text available.');
      return { score: 50, keywords: [], applicantKeywords: [] };
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

    // Extract keywords from job
    const jobKeywords = await extractJobKeywords(model, job);
    console.log(`📋 Job Keywords: ${jobKeywords.length} keywords extracted`);

    // Extract keywords from applicant resume
    const applicantKeywords = await extractApplicantKeywords(applicant);
    console.log(`👤 Applicant Keywords: ${applicantKeywords.length} keywords extracted`);

    if (jobKeywords.length === 0) {
      const basicKeywords = extractBasicKeywords(job);
      const score = await compareApplicantWithKeywords(model, basicKeywords, applicant);
      return { score, keywords: basicKeywords, applicantKeywords };
    }

    // Compare and calculate score
    const score = await compareApplicantWithKeywords(model, jobKeywords, applicant);
    console.log(`✨ ATS Score: ${score}%`);

    return { score, keywords: jobKeywords, applicantKeywords };
  } catch (error) {
    console.error('Error calculating ATS score:', error);
    const basicScore = calculateBasicScore(applicant);
    const basicKeywords = extractBasicKeywords(job);
    const basicApplicantKeywords = extractBasicApplicantKeywords(applicant);
    return { score: basicScore, keywords: basicKeywords, applicantKeywords: basicApplicantKeywords };
  }
};

/**
 * Extract keywords from job description using Gemini
 */
const extractJobKeywords = async (model: any, job: IJob): Promise<string[]> => {
  const cleanDescription = job.description
    ? job.description
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/[\[\]<>{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : 'Not provided';

  const prompt = `
Extract ONLY technical skills, tools, and technologies from this job description.

INCLUDE:
- Programming languages (JavaScript, Python, Java, etc.)
- Frameworks & libraries (React, Node.js, Express, etc.)
- Databases (MongoDB, PostgreSQL, MySQL, etc.)
- Tools & platforms (Git, Docker, AWS, etc.)
- Technical concepts (REST API, GraphQL, CI/CD, etc.)
- Years of experience (e.g., "3+ years")
- Required degrees (Bachelor's, Master's, etc.)

DO NOT INCLUDE:
- Job titles, generic words, locations, soft skills

Job Description:
${cleanDescription}

Return ONLY a comma-separated list of technical keywords.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .filter((k: string) => !/<|>|\[|\]|{|}|&/.test(k))
      .slice(0, 25);

    if (keywords.length > 0) {
      return keywords;
    }
    return extractBasicKeywords(job);
  } catch (error) {
    console.error('Error extracting job keywords:', error);
    return extractBasicKeywords(job);
  }
};

/**
 * Extract keywords from applicant resume using Gemini
 */
export const extractApplicantKeywords = async (applicant: ApplicantData): Promise<string[]> => {
  try {
    const ai = initializeGemini();
    if (!ai || !applicant.resumeText) {
      return extractBasicApplicantKeywords(applicant);
    }

    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const cleanResumeText = applicant.resumeText
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[\[\]<>{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const prompt = `
Extract ONLY technical skills, tools, and technologies from this resume.

INCLUDE:
- Programming languages, frameworks, databases
- Tools & platforms (Git, Docker, AWS, etc.)
- Technical concepts (REST API, GraphQL, etc.)
- Certifications, degrees
- Years of experience

DO NOT INCLUDE:
- Names, emails, phone numbers, addresses
- URLs, locations, company names
- Generic words, soft skills

Resume Content:
${cleanResumeText.substring(0, 2000)}

Return ONLY a comma-separated list of technical skills.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .filter((k: string) => !/<|>|\[|\]|{|}|&/.test(k))
      .slice(0, 25);

    if (keywords.length > 0) {
      return keywords;
    }

    return extractBasicApplicantKeywords(applicant);
  } catch (error) {
    console.error('Error extracting applicant keywords:', error);
    return extractBasicApplicantKeywords(applicant);
  }
};

/**
 * Compare applicant with keywords using Gemini
 */
export const compareApplicantWithKeywords = async (
  model: any,
  keywords: string[],
  applicant: ApplicantData
): Promise<number> => {
  const resumeContent = applicant.resumeText || '';
  const coverLetterContent = applicant.coverLetter || '';
  
  const prompt = `
You are an ATS evaluator. Compare this applicant's resume with the job keywords and give a match score from 0-100.

Job Keywords:
${keywords.map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}

Applicant Resume:
${resumeContent.substring(0, 3000)}

${coverLetterContent ? `Cover Letter:\n${coverLetterContent.substring(0, 500)}` : ''}

Evaluate based on:
1. Keyword matches (40%)
2. Skills relevance (30%)
3. Technical skills match (20%)
4. Overall alignment (10%)

Scoring:
- 90-100: Excellent match
- 70-89: Good match
- 50-69: Moderate match
- 30-49: Weak match
- 10-29: Poor match
- 0-9: No match

Return ONLY a number between 0-100.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract number from response
    const numbers = text.match(/\b([0-9]{1,3})\b/g) || [];
    let score = 0;
    
    if (numbers.length > 0) {
      const validScores = numbers
        .map((n: string) => parseInt(n))
        .filter((n: number) => n >= 0 && n <= 100);
      
      if (validScores.length > 0) {
        score = Math.max(...validScores);
      } else {
        score = parseInt(numbers[0]);
      }
    } else {
      score = parseInt(text.trim());
    }
    
    // Validate score
    if (isNaN(score) || score < 0 || score > 100) {
      return compareKeywordsBasic(keywords, applicant);
    }
    
    // If score is suspiciously low, validate with basic comparison
    if (score <= 10 && resumeContent.length > 100) {
      const basicScore = compareKeywordsBasic(keywords, applicant);
      if (basicScore > score) {
        console.log(`⚠️  Using basic comparison score (${basicScore}%) instead of Gemini score (${score}%)`);
        return basicScore;
      }
    }
    
    return score;
  } catch (error) {
    console.error('Error comparing with Gemini:', error);
    return compareKeywordsBasic(keywords, applicant);
  }
};

/**
 * Basic keyword extraction from job description
 */
const extractBasicKeywords = (job: IJob): string[] => {
  const description = job.description || '';
  
  const cleanText = description
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\[\]<>{}]/g, ' ')
    .replace(/🚀|📍|🕒|💼|[^\x00-\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
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
  
  for (const keyword of technicalKeywords) {
    if (lowerText.includes(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const match = cleanText.match(regex);
      if (match && match[0]) {
        foundKeywords.push(match[0]);
      }
    }
  }
  
  // Extract experience requirements
  const experienceMatch = cleanText.match(/\d+[\s]*[-+]?[\s]*years?/gi);
  if (experienceMatch) {
    foundKeywords.push(...experienceMatch);
  }
  
  // Extract degree requirements
  const degreeMatch = cleanText.match(/\b(bachelor'?s?|master'?s?|phd|doctorate)\b/gi);
  if (degreeMatch) {
    foundKeywords.push(...degreeMatch);
  }
  
  if (foundKeywords.length > 0) {
    return [...new Set(foundKeywords)].slice(0, 20);
  }
  
  // Last resort: extract capitalized words
  const words = cleanText.split(/[\s,;.():]+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => /^[A-Z]/.test(word))
    .filter((word: string) => !/^(The|And|For|With|From|About|Role|Join|Looking|We|Are|You|Will|Can|Must|Should|Have)$/i.test(word));
  
  return [...new Set(words)].slice(0, 20);
};

/**
 * Basic keyword extraction from applicant resume
 */
const extractBasicApplicantKeywords = (applicant: ApplicantData): string[] => {
  const resumeText = applicant.resumeText || '';
  
  const cleanText = resumeText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\[\]<>{}]/g, ' ')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/www\.[^\s]+/gi, '')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '')
    .replace(/\+?[\d\s()-]{7,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
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
  
  for (const keyword of technicalKeywords) {
    if (lowerText.includes(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const match = cleanText.match(regex);
      if (match && match[0]) {
        foundKeywords.push(match[0]);
      }
    }
  }
  
  if (foundKeywords.length > 0) {
    return [...new Set(foundKeywords)].slice(0, 20);
  }
  
  // Last resort: extract capitalized words
  const words = cleanText.split(/[\s,;.():]+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => /^[A-Z]/.test(word))
    .filter((word: string) => !/^(The|And|For|With|From|About|Objective|Enthusiastic)$/i.test(word));
  
  return [...new Set(words)].slice(0, 20);
};

/**
 * Basic keyword comparison with resume
 */
export const compareKeywordsBasic = (keywords: string[], applicant: ApplicantData): number => {
  try {
    let matchCount = 0;
    const totalKeywords = keywords.length;

    if (totalKeywords === 0) {
      return calculateBasicScore(applicant);
    }

    const resumeText = (applicant.resumeText || '').toLowerCase();
    const coverLetterText = (applicant.coverLetter || '').toLowerCase();
    const applicantText = `${resumeText} ${coverLetterText}`.toLowerCase();

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase().trim();
      const cleanKeyword = keywordLower
        .replace(/\.js$/, '')
        .replace(/\.ts$/, '')
        .replace(/\+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Try exact match
      if (applicantText.includes(keywordLower) || applicantText.includes(cleanKeyword)) {
        matchCount++;
      } else {
        // Try partial match for multi-word keywords
        const keywordParts = cleanKeyword.split(/[\s,.\-+]+/).filter(part => part.length > 2);
        if (keywordParts.length > 0) {
          const partialMatches = keywordParts.filter(part => applicantText.includes(part));
          if (partialMatches.length >= Math.ceil(keywordParts.length * 0.5)) {
            matchCount++;
          }
        }
      }
    });

    let score = Math.round((matchCount / totalKeywords) * 100);

    // Add quality bonus if we have matches
    if (matchCount > 0 && score < 30 && resumeText.length > 200) {
      const bonus = Math.min(10, Math.floor(matchCount * 2));
      score = Math.min(100, score + bonus);
    }

    // Minimum score for substantial resume
    if (score === 0 && resumeText.length > 500) {
      score = 5;
    } else if (score === 0 && resumeText.length > 200) {
      score = 3;
    }

    return score;
  } catch (error) {
    console.error('Error in basic comparison:', error);
    return calculateBasicScore(applicant);
  }
};

/**
 * Calculate basic score based on resume content
 */
const calculateBasicScore = (applicant: ApplicantData): number => {
  let score = 40;

  const resumeText = (applicant.resumeText || '').toLowerCase();
  const coverLetter = (applicant.coverLetter || '').toLowerCase();

  // Resume length bonus
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
