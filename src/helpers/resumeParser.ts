/**
 * Resume Parser - Extracts text content from PDF resumes
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Polyfill for DOMMatrix if not available
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      // Minimal implementation for pdf-parse
    }
  } as any;
}

/**
 * Extract text from PDF resume file
 */
export const extractResumeText = async (resumeUrl: string): Promise<string> => {
  try {
    // Clean path and get full file path
    const cleanPath = resumeUrl.startsWith('/') ? resumeUrl.substring(1) : resumeUrl;
    const fullPath = path.join(process.cwd(), cleanPath);
    
    console.log(`📄 Parsing resume: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Resume file not found: ${fullPath}`);
      return '';
    }

    // Check file extension
    const ext = path.extname(fullPath).toLowerCase();
    if (ext !== '.pdf') {
      console.log(`⚠️  Unsupported file format: ${ext}`);
      return '';
    }

    // Read PDF file
    const dataBuffer = fs.readFileSync(fullPath);

    // Try multiple extraction methods in order of preference
    let text = '';
    
    // Method 1: Try pdf-parse with proper import
    try {
      text = await extractWithPDFParse(dataBuffer);
      if (text && text.trim().length > 50) {
        const cleanedText = cleanExtractedText(text);
        console.log(`✅ Parsed resume with pdf-parse: ${cleanedText.length} characters extracted`);
        return cleanedText;
      }
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.log(`⚠️  pdf-parse error: ${errorMessage}`);
    }

    // Method 2: Try pdf2json as alternative
    if (!text || text.trim().length < 50) {
      try {
        text = await extractWithPDF2JSON(dataBuffer);
        if (text && text.trim().length > 50) {
          const cleanedText = cleanExtractedText(text);
          console.log(`✅ Parsed resume with pdf2json: ${cleanedText.length} characters extracted`);
          return cleanedText;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  pdf2json error: ${errorMessage}`);
      }
    }

    // Method 3: Try external tools (pdftotext)
    if (!text || text.trim().length < 50) {
      try {
        text = await extractWithPDfToText(fullPath);
        if (text && text.trim().length > 50) {
          const cleanedText = cleanExtractedText(text);
          console.log(`✅ Parsed resume with pdftotext: ${cleanedText.length} characters extracted`);
          return cleanedText;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️  pdftotext error: ${errorMessage}`);
      }
    }

    // Method 4: Enhanced text extraction as fallback
    console.log('⚠️  Falling back to enhanced text extraction...');
    const enhancedText = extractEnhancedTextFromPDF(dataBuffer);
    if (enhancedText && enhancedText.trim().length > 50) {
      console.log(`✅ Extracted enhanced text: ${enhancedText.length} characters`);
      return enhancedText;
    }

    console.log('❌ All extraction methods failed');
    return '';
  } catch (error) {
    console.error('Error extracting resume text:', error);
    return '';
  }
};

/**
 * Clean extracted text
 */
const cleanExtractedText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\w\s\-.,;:!?()@#&\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extract text using pdf-parse library
 */
const extractWithPDFParse = async (buffer: Buffer): Promise<string> => {
  try {
    // Try different import approaches
    let pdfParse: any;
    
    try {
      // Approach 1: Default import
      const pdfParseModule = await import('pdf-parse');
      pdfParse = pdfParseModule.default || pdfParseModule;
    } catch (e) {
      // Approach 2: Require
      pdfParse = require('pdf-parse');
    }
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse is not a function');
    }
    
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    throw new Error(`pdf-parse failed: ${error}`);
  }
};

/**
 * Extract text using pdf2json library
 */
const extractWithPDF2JSON = async (buffer: Buffer): Promise<string> => {
  try {
    // Try different import approaches
    let PDFParser: any;
    
    try {
      // Approach 1: Default import
      const pdf2jsonModule = await import('pdf2json');
      PDFParser = pdf2jsonModule.default || pdf2jsonModule.PDFParser;
    } catch (e) {
      // Approach 2: Require
      PDFParser = require('pdf2json').PDFParser;
    }
    
    if (typeof PDFParser !== 'function') {
      throw new Error('PDFParser is not a constructor');
    }
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      let text = '';
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(errData.parserError));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from parsed PDF data
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R && textItem.R.length > 0) {
                    textItem.R.forEach((r: any) => {
                      if (r.T) {
                        // Decode URI-encoded text
                        const decodedText = decodeURIComponent(r.T);
                        text += decodedText + ' ';
                      }
                    });
                  }
                });
              }
            });
          }
          
          resolve(text.trim());
        } catch (error) {
          reject(error);
        }
      });
      
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    throw new Error(`pdf2json failed: ${error}`);
  }
};

/**
 * Extract text using external pdftotext tool
 */
const extractWithPDfToText = async (fullPath: string): Promise<string> => {
  try {
    // Check if pdftotext is available
    try {
      await execAsync('which pdftotext');
    } catch (e) {
      throw new Error('pdftotext is not available');
    }
    
    // Create a temporary file for the output
    const tempPath = fullPath + '.txt';
    
    // Run pdftotext
    await execAsync(`pdftotext -layout "${fullPath}" "${tempPath}"`);
    
    // Read the extracted text
    const text = fs.readFileSync(tempPath, 'utf8');
    
    // Clean up the temporary file
    fs.unlinkSync(tempPath);
    
    return text;
  } catch (error) {
    throw new Error(`pdftotext failed: ${error}`);
  }
};

/**
 * Enhanced text extraction from PDF (fallback method)
 */
const extractEnhancedTextFromPDF = (buffer: Buffer): string => {
  try {
    // Convert buffer to string and look for readable text patterns
    const rawText = buffer.toString('utf8', 0, Math.min(buffer.length, 2000000));
    
    // Method 1: Extract text between parentheses (common PDF text format)
    const parenMatches = rawText.match(/\((.*?)\)/g) || [];
    const parenText = parenMatches
      .map(match => {
        let content = match.slice(1, -1);
        // Decode PDF escape sequences
        content = content
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .replace(/\\(\d{3})/g, (match, octal) => {
            // Decode octal escape sequences
            const code = parseInt(octal, 8);
            return String.fromCharCode(code);
          });
        return content;
      })
      .filter(str => {
        // Filter out garbage
        const hasLetters = /[a-zA-Z]{2,}/.test(str);
        const notTooShort = str.length > 2;
        const notJustNumbers = !/^\d+$/.test(str);
        const notMetadata = !str.includes('D:') && 
                           !str.includes('ReportLab') && 
                           !str.includes('anonymous') &&
                           !str.includes('unspecified') &&
                           !str.includes('endobj') &&
                           !str.includes('/Type') &&
                           !str.includes('/Subtype');
        return hasLetters && notTooShort && notJustNumbers && notMetadata;
      })
      .join(' ');
    
    // Method 2: Extract text from BT...ET blocks (PDF text objects)
    const btMatches = rawText.match(/BT[\s\S]*?ET/g) || [];
    const btText = btMatches
      .map(block => {
        const blockMatches = block.match(/\((.*?)\)/g) || [];
        return blockMatches
          .map(m => {
            let content = m.slice(1, -1);
            content = content
              .replace(/\\n/g, ' ')
              .replace(/\\r/g, ' ')
              .replace(/\\t/g, ' ')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\')
              .replace(/\\(\d{3})/g, (match, octal) => {
                const code = parseInt(octal, 8);
                return String.fromCharCode(code);
              });
            return content;
          })
          .filter(str => {
            const hasLetters = /[a-zA-Z]{2,}/.test(str);
            const notTooShort = str.length > 2;
            const notMetadata = !str.includes('D:') && !str.includes('ReportLab');
            return hasLetters && notTooShort && notMetadata;
          })
          .join(' ');
      })
      .filter(str => str.length > 0 && /[a-zA-Z]{3,}/.test(str))
      .join(' ');
    
    // Method 3: Look for readable ASCII text patterns
    const readableTexts = rawText.match(/[a-zA-Z0-9\s.,;:!?()@#&\-\/]+/g) || [];
    const readableText = readableTexts
      .filter(str => {
        return str.length > 10 && 
               str.split(/\s+/).length > 3 && 
               /[a-zA-Z]{3,}/.test(str) &&
               !str.includes('D:') && 
               !str.includes('ReportLab') && 
               !str.includes('anonymous') &&
               !str.includes('endobj') &&
               !str.includes('/Type') &&
               !str.includes('/Subtype');
      })
      .join(' ');
    
    // Combine all extracted text
    let combinedText = [parenText, btText, readableText].join(' ');
    
    // Clean up the combined text
    const cleanedText = combinedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:!?()@#&\/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Final validation
    const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 2).length;
    const hasMeaningfulContent = wordCount > 10 && /[a-zA-Z]{3,}/.test(cleanedText);
    
    if (hasMeaningfulContent && cleanedText.length > 100) {
      return cleanedText;
    } else {
      console.log(`⚠️  Enhanced extraction found limited content: ${cleanedText.length} chars, ${wordCount} words`);
      return '';
    }
  } catch (error) {
    console.error('Error in enhanced text extraction:', error);
    return '';
  }
};

/**
 * Check if document is likely a resume
 */
export const isLikelyResume = (text: string): boolean => {
  if (!text || text.trim().length < 100) {
    return false;
  }

  const lowerText = text.toLowerCase();
  
  // Check for strong resume indicators
  const resumeIndicators = [
    'experience', 'skills', 'education', 'objective', 'summary',
    'employment', 'project', 'certification', 'qualification',
    'technical skills', 'professional', 'background', 'expertise',
    'work history', 'career', 'portfolio'
  ];
  
  let resumeScore = 0;
  for (const indicator of resumeIndicators) {
    if (lowerText.includes(indicator)) {
      resumeScore++;
    }
  }
  
  // Check for technical skills
  const technicalSkills = [
    'javascript', 'python', 'java', 'react', 'node', 'html', 'css',
    'mongodb', 'sql', 'git', 'aws', 'docker', 'api', 'rest',
    'typescript', 'angular', 'vue', 'express', 'mysql', 'postgresql'
  ];
  
  let technicalScore = 0;
  for (const skill of technicalSkills) {
    if (lowerText.includes(skill)) {
      technicalScore++;
    }
  }
  
  // Check for non-resume indicators
  const nonResumeIndicators = [
    'proforma invoice', 'invoice', 'bill of lading', 'shipping instruction',
    'port of shipment', 'port of discharge', 'container type',
    'total invoice value', 'advance payment', 'balance payment',
    'shipping marks', 'description of goods', 'quantity unit',
    'exporter', 'consignee', 'shipment period', 'mode of shipment'
  ];
  
  let nonResumeScore = 0;
  for (const indicator of nonResumeIndicators) {
    if (lowerText.includes(indicator)) {
      nonResumeScore++;
    }
  }
  
  // Decision logic
  // If there are 3 or more non-resume indicators, it's definitely not a resume
  if (nonResumeScore >= 3) {
    return false;
  }
  
  // If there are at least 2 resume indicators AND at least 2 technical skills, it's likely a resume
  if (resumeScore >= 2 && technicalScore >= 2) {
    return true;
  }
  
  // If there are at least 4 resume indicators, it's likely a resume
  if (resumeScore >= 4) {
    return true;
  }
  
  // Otherwise, it's probably not a resume
  return false;
};

export default extractResumeText;