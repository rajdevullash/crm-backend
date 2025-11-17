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
    console.log('═════════════════════════════════════════════════');
    console.log('🔍 ATS SCORE CALCULATION - STEP BY STEP DEBUG');
    console.log('═════════════════════════════════════════════════');
    console.log(`📋 Job: ${job.title}`);
    console.log(`📄 Resume text length: ${applicant.resumeText?.length || 0} characters`);

    if (!applicant.resumeText || applicant.resumeText.trim().length === 0) {
      console.log('❌ No resume text provided');
      return { score: 0, keywords: [], applicantKeywords: [] };
    }

    const ai = initializeGemini();
    
    // Use saved job keywords from database if available, otherwise extract from description
    let jobKeywords: string[] = [];
    if (job.extractedKeywords && job.extractedKeywords.length > 0) {
      jobKeywords = job.extractedKeywords;
      console.log(`📋 Using saved job keywords (${jobKeywords.length} keywords)`);
    } else {
      // Fallback: Extract keywords from job description if not saved
      if (ai) {
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        jobKeywords = await extractJobKeywords(model, job);
        console.log(`📋 Extracted job keywords (${jobKeywords.length} keywords)`);
      } else {
        jobKeywords = extractBasicKeywords(job);
        console.log(`📋 Using basic job keywords (${jobKeywords.length} keywords)`);
      }
    }

    console.log(`📋 Job Keywords: [${jobKeywords.join(', ')}]`);

    // Extract keywords from applicant resume
    let applicantKeywords: string[] = [];
    try {
      if (ai) {
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        applicantKeywords = await extractApplicantKeywords(model, applicant, jobKeywords);
        console.log(`🤖 Gemini extracted applicant keywords (${applicantKeywords.length} keywords)`);
      }
      
      // Fallback to basic extraction if Gemini returns empty or fails
      if (applicantKeywords.length === 0) {
        applicantKeywords = extractBasicApplicantKeywords(applicant, jobKeywords);
        console.log(`📝 Basic extraction found applicant keywords (${applicantKeywords.length} keywords)`);
      }
    } catch (error: unknown) {
      console.log('⚠️  Error extracting applicant keywords with Gemini, using fallback');
      applicantKeywords = extractBasicApplicantKeywords(applicant, jobKeywords);
    }

    console.log(`📋 Applicant Keywords: [${applicantKeywords.join(', ')}]`);

    // Compare keywords and calculate score
    let score: number;
    
    if (applicantKeywords.length > 0) {
      score = compareApplicantKeywordsWithJobKeywords(applicantKeywords, jobKeywords);
      console.log(`📊 Score calculated from keyword comparison: ${score}%`);
    } else {
      // Fallback scoring methods
      if (ai && jobKeywords.length > 0) {
        try {
          const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
          score = await compareApplicantWithKeywords(model, jobKeywords, applicant);
          console.log(`🤖 Gemini calculated score: ${score}%`);
        } catch (compareError: any) {
          const errorMessage = compareError?.message || String(compareError);
          if (!errorMessage.includes('429') && !errorMessage.includes('Too Many Requests')) {
            console.error('Error comparing with Gemini:', compareError);
          }
          score = compareKeywordsBasic(jobKeywords, applicant);
          console.log(`📝 Basic comparison score: ${score}%`);
        }
      } else {
        score = compareKeywordsBasic(jobKeywords, applicant);
        console.log(`📝 Basic comparison score: ${score}%`);
      }
    }

    // Ensure score is within valid range
    score = Math.max(0, Math.min(100, score));
    
    console.log(`✅ Final ATS Score: ${score}%`);
    console.log('═════════════════════════════════════════════════');

    return { score, keywords: jobKeywords, applicantKeywords };
  } catch (error) {
    console.error('Error calculating ATS score:', error);
    
    // Use saved job keywords from database if available
    let basicKeywords: string[] = [];
    if (job.extractedKeywords && job.extractedKeywords.length > 0) {
      basicKeywords = job.extractedKeywords;
    } else {
      basicKeywords = extractBasicKeywords(job);
    }
    
    // Extract applicant keywords - search resume for job keywords
    const basicApplicantKeywords = extractBasicApplicantKeywords(applicant, basicKeywords);
    
    // Compare saved job keywords with resume keywords
    const basicScore = compareKeywordsBasic(basicKeywords, applicant);
    
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
const extractApplicantKeywords = async (
  model: any,
  applicant: ApplicantData,
  jobKeywords?: string[]
): Promise<string[]> => {
  if (!applicant.resumeText) {
    return [];
  }

  const cleanResumeText = applicant.resumeText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[\[\]<>{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Check if resume text is meaningful
  const isGarbageText = 
    cleanResumeText.length < 100 ||
    /^(anonymous|D:\d+|ReportLab|unspecified)/i.test(cleanResumeText) ||
    !/[a-zA-Z]{4,}/.test(cleanResumeText) ||
    cleanResumeText.split(/\s+/).filter(w => w.length > 3).length < 10;
  
  if (isGarbageText) {
    console.log('⚠️  Resume text appears to be garbage or metadata');
    return [];
  }

  // Build prompt with job keywords context if available
  let prompt = '';
  if (jobKeywords && jobKeywords.length > 0) {
    prompt = `
Extract ONLY technical skills, tools, and technologies from this resume that match or relate to these job requirements: ${jobKeywords.join(', ')}.

PRIORITY: Focus on extracting keywords that match the job requirements listed above.

INCLUDE:
- Programming languages, frameworks, databases that match job requirements
- Tools & platforms (Git, Docker, AWS, etc.) that match job requirements
- Technical concepts (REST API, GraphQL, etc.) that match job requirements
- Certifications, degrees
- Years of experience
- Any other technical skills mentioned in the resume

DO NOT INCLUDE:
- Names, emails, phone numbers, addresses
- URLs, locations, company names
- Generic words, soft skills
- PDF metadata or encoding artifacts

Resume Content:
 ${cleanResumeText.substring(0, 4000)}

Return ONLY a comma-separated list of technical skills that are relevant to the job requirements.`;
  } else {
    prompt = `
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
- PDF metadata or encoding artifacts

Resume Content:
 ${cleanResumeText.substring(0, 4000)}

Return ONLY a comma-separated list of technical skills.`;
  }

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const keywords = text
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0)
      .filter((k: string) => !/<|>|\[|\]|{|}|&/.test(k))
      .slice(0, 25);

    return keywords;
  } catch (error) {
    console.error('Error extracting applicant keywords with Gemini:', error);
    return [];
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
- 10-29: Resume match
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
        return basicScore;
      }
    }
    
    return score;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (!errorMessage.includes('429') && !errorMessage.includes('Too Many Requests')) {
      console.error('Error comparing with Gemini:', error);
    }
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
    'javascript', 'js', 'typescript', 'python', 'java', 'c++', 'c#', 'csharp', 'php', 'ruby', 'go', 'rust',
    'react', 'reactjs', 'react.js', 'angular', 'vue', 'next', 'nextjs', 'next.js', 'node', 'nodejs', 'node.js', 
    'express', 'expressjs', 'express.js', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'firebase', 'sql', 'sqlserver', 'mongoose',
    'git', 'github', 'docker', 'docker-compose', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp',
    'api', 'rest', 'rest api', 'rest apis', 'graphql', 'jwt', 'oauth', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'redux', 'jest', 'mocha', 'chai', 'webpack', 'babel', 'npm', 'yarn', 'pnpm', 'ci/cd',
    'mern', 'mean', 'lamp', 'full stack', 'fullstack', 'frontend', 'backend'
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
const extractBasicApplicantKeywords = (applicant: ApplicantData, jobKeywords?: string[]): string[] => {
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
  
  const foundKeywords: string[] = [];
  const lowerText = cleanText.toLowerCase();
  
  // Comprehensive technical keywords list
  const technicalKeywords = [
    'javascript', 'js', 'typescript', 'python', 'java', 'c++', 'c#', 'csharp', 'php', 'ruby', 'go', 'rust',
    'react', 'reactjs', 'react.js', 'angular', 'vue', 'next', 'nextjs', 'next.js', 'node', 'nodejs', 'node.js', 
    'express', 'expressjs', 'express.js', 'django', 'spring', 'flask',
    'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'firebase', 'sql', 'sqlserver', 'mongoose',
    'git', 'github', 'docker', 'docker-compose', 'kubernetes', 'k8s', 'aws', 'azure', 'gcp',
    'api', 'rest', 'rest api', 'rest apis', 'graphql', 'jwt', 'oauth', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'redux', 'jest', 'mocha', 'chai', 'webpack', 'babel', 'npm', 'yarn', 'pnpm', 'ci/cd',
    'bachelor', 'master', 'degree', 'certification', 'certified', 'authentication',
    'mern', 'mean', 'lamp', 'full stack', 'fullstack', 'frontend', 'backend'
  ];
  
  // If job keywords are provided, search for those first (priority)
  if (jobKeywords && jobKeywords.length > 0) {
    for (const jobKeyword of jobKeywords) {
      const keywordLower = jobKeyword.toLowerCase().trim();
      const cleanKeyword = keywordLower
        .replace(/\.js$/g, '')
        .replace(/\.ts$/g, '')
        .replace(/\+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Try exact match
      if (lowerText.includes(keywordLower) || lowerText.includes(cleanKeyword)) {
        const regex = new RegExp(`\\b${jobKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const match = cleanText.match(regex);
        if (match && match[0]) {
          foundKeywords.push(match[0]);
        } else {
          foundKeywords.push(jobKeyword);
        }
      } else {
        // Try partial match for multi-word keywords
        const keywordParts = cleanKeyword.split(/[\s,.\-+]+/).filter(part => part.length > 2);
        if (keywordParts.length > 0) {
          for (const part of keywordParts) {
            if (lowerText.includes(part)) {
              const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
              const partMatch = cleanText.match(partRegex);
              if (partMatch && partMatch[0]) {
                foundKeywords.push(partMatch[0]);
                break;
              }
            }
          }
        }
      }
    }
    
    if (foundKeywords.length > 0) {
      return [...new Set(foundKeywords)].slice(0, 30);
    }
  }
  
  // Fallback: search for common technical keywords
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
    return [...new Set(foundKeywords)].slice(0, 30);
  }
  
  // Last resort: extract capitalized words
  const words = cleanText.split(/[\s,;.():]+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => /^[A-Z]/.test(word))
    .filter((word: string) => !/^(The|And|For|With|From|About|Objective|Enthusiastic)$/i.test(word));
  
  return [...new Set(words)].slice(0, 20);
};

/**
 * Compare applicant keywords with job keywords and calculate score
 */
const compareApplicantKeywordsWithJobKeywords = (applicantKeywords: string[], jobKeywords: string[]): number => {
  try {
    if (jobKeywords.length === 0) {
      return 0;
    }

    const matchedKeywords: string[] = [];
    const unmatchedKeywords: string[] = [];
    let matchCount = 0;

    // Enhanced keyword normalization
    const normalizeKeyword = (keyword: string): string => {
      let s = keyword.toLowerCase().trim();
      s = s.replace(/^['\"]+|['\"]+$/g, '');
      
      // Comprehensive canonical mappings
      const variations: { [key: string]: string } = {
        'react.js': 'react',
        'reactjs': 'react',
        'node.js': 'node',
        'nodejs': 'node',
        'express.js': 'express',
        'expressjs': 'express',
        'javascript': 'js',
        'typescript': 'ts',
        'postgresql': 'postgres',
        'mongodb': 'mongodb',
        'github': 'git',
        'aws': 'amazon web services',
        'ci/cd': 'cicd',
        'ci cd': 'cicd',
        'rest apis': 'rest api',
        'mern': 'mongodb express react node',
        'full stack': 'fullstack',
        'fullstack': 'full stack',
        '0-1 year': '0-1 years',
        '1+ year': '1+ years',
        '2+ year': '2+ years',
        '3+ year': '3+ years'
      };
      
      // Apply variations
      for (const [variant, standard] of Object.entries(variations)) {
        if (s.includes(variant)) {
          s = s.replace(new RegExp(variant, 'gi'), standard);
        }
      }
      
      // Remove special characters and normalize spaces
      s = s.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      return s;
    };

    // Normalize all keywords
    const normalizedJobKeywords = jobKeywords.map(k => normalizeKeyword(k));
    const normalizedApplicantKeywords = applicantKeywords.map(k => normalizeKeyword(k));
    
    console.log('🔎 Normalized Job Keywords:', normalizedJobKeywords);
    console.log('🔎 Normalized Applicant Keywords:', normalizedApplicantKeywords);

    // Create a map of applicant keywords for faster lookup
    const applicantKeywordMap = new Map<string, number>();
    normalizedApplicantKeywords.forEach((keyword, index) => {
      applicantKeywordMap.set(keyword, index);
    });

    // Check each job keyword against applicant keywords
    jobKeywords.forEach((jobKeyword, index) => {
      const normalizedJobKeyword = normalizedJobKeywords[index];
      let found = false;

      // Check for exact match
      if (applicantKeywordMap.has(normalizedJobKeyword)) {
        matchCount++;
        matchedKeywords.push(jobKeyword);
        found = true;
      } else {
        // Check for partial match with word boundaries
        for (let i = 0; i < applicantKeywords.length; i++) {
          const normalizedApplicantKeyword = normalizedApplicantKeywords[i];
          
          // Skip if already matched with this applicant keyword
          if (matchedKeywords.includes(applicantKeywords[i])) {
            continue;
          }
          
          // Try partial match (e.g., "React.js" matches "React")
          const jobParts = normalizedJobKeyword.split(' ').filter(p => p.length > 2);
          const applicantParts = normalizedApplicantKeyword.split(' ').filter(p => p.length > 2);
          
          if (jobParts.length > 0 && applicantParts.length > 0) {
            // Check if significant parts match
            const matchingParts = jobParts.filter(jp => 
              applicantParts.some(ap => ap.includes(jp) || jp.includes(ap))
            );
            
            if (matchingParts.length >= Math.ceil(jobParts.length * 0.6)) {
              matchCount++;
              matchedKeywords.push(jobKeyword);
              found = true;
              break;
            }
          }
          
          // Try reverse partial match (one contains the other)
          if (normalizedApplicantKeyword.includes(normalizedJobKeyword) || 
              normalizedJobKeyword.includes(normalizedApplicantKeyword)) {
            matchCount++;
            matchedKeywords.push(jobKeyword);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        unmatchedKeywords.push(jobKeyword);
      }
    });

    // Calculate base score
    let score = Math.round((matchCount / jobKeywords.length) * 100);

    console.log(`✅ Matched ${matchCount} / ${jobKeywords.length} job keywords`);
    console.log('✅ Matched keywords:', matchedKeywords);
    if (unmatchedKeywords.length > 0) {
      console.log('⚠️ Unmatched job keywords:', unmatchedKeywords);
    }

    // Add bonus for having multiple applicant keywords that match
    if (matchCount > 0 && applicantKeywords.length >= matchCount) {
      const coverageBonus = Math.min(10, Math.floor((matchCount / applicantKeywords.length) * 10));
      score = Math.min(100, score + coverageBonus);
    }

    // NO MINIMUM SCORE FOR PARTIAL MATCHES - SCORE CAN BE 0 IF NO MATCHES
    // Removed: if (matchCount > 0 && score < 30) { score = 30; }

    return score;
  } catch (error) {
    console.error('Error comparing applicant keywords with job keywords:', error);
    return Math.min(50, Math.round((applicantKeywords.length / Math.max(jobKeywords.length, 1)) * 50));
  }
};

/**
 * Basic keyword comparison with resume
 */
export const compareKeywordsBasic = (keywords: string[], applicant: ApplicantData): number => {
  try {
    let matchCount = 0;
    const totalKeywords = keywords.length;
    const matchedKeywords: string[] = [];
    const unmatchedKeywords: string[] = [];

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
        matchedKeywords.push(keyword);
      } else {
        // Try partial match for multi-word keywords
        const keywordParts = cleanKeyword.split(/[\s,.\-+]+/).filter(part => part.length > 2);
        if (keywordParts.length > 0) {
          const partialMatches = keywordParts.filter(part => applicantText.includes(part));
          if (partialMatches.length >= Math.ceil(keywordParts.length * 0.5)) {
            matchCount++;
            matchedKeywords.push(keyword);
          } else {
            unmatchedKeywords.push(keyword);
          }
        } else {
          unmatchedKeywords.push(keyword);
        }
      }
    });

    let score = Math.round((matchCount / totalKeywords) * 100);

    // Add quality bonus if we have matches
    if (matchCount > 0 && score < 30 && resumeText.length > 200) {
      const bonus = Math.min(10, Math.floor(matchCount * 2));
      score = Math.min(100, score + bonus);
    }

    // NO MINIMUM SCORE FOR PARTIAL MATCHES - SCORE CAN BE 0 IF NO MATCHES
    // Removed: if (score === 0 && resumeText.length > 500) { score = 5; }
    // Removed: if (score === 0 && resumeText.length > 200) { score = 3; }

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