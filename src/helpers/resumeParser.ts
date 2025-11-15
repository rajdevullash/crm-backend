/**
 * Resume Parser - Extracts text content from PDF resumes
 */

import fs from 'fs';
import path from 'path';

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

    // Try to parse with pdf-parse using dynamic import to avoid browser API issues
    try {
      // Use dynamic import instead of require to avoid browser API polyfill issues
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule.default || pdfParseModule) as unknown as (input: Buffer) => Promise<{ text: string }>;

      const data = await pdfParse(dataBuffer);
      const text = data && typeof data.text === 'string' ? data.text : '';

      // Clean the extracted text
      const cleanedText = text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      if (cleanedText.length > 0) {
        console.log(`✅ Parsed resume with pdf-parse: ${cleanedText.length} characters extracted`);
        return cleanedText;
      } else {
        console.log('⚠️  pdf-parse returned empty text. Trying enhanced extraction...');
        return extractEnhancedTextFromPDF(dataBuffer);
      }
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      console.log(`⚠️  pdf-parse error: ${errorMessage}`);
      console.log('⚠️  Falling back to enhanced text extraction...');
      
      // Use enhanced extraction as fallback
      return extractEnhancedTextFromPDF(dataBuffer);
    }
  } catch (error) {
    console.error('Error extracting resume text:', error);
    return '';
  }
};

/**
 * Enhanced text extraction from PDF (fallback method)
 * Uses multiple strategies to extract readable text from PDF
 */
const extractEnhancedTextFromPDF = (buffer: Buffer): string => {
  try {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 1000000));
    const extractedParts: string[] = [];
    
    // Method 1: Extract text between parentheses (common PDF text format)
    // This is the most common format for PDF text content
    const parenMatches = text.match(/\((.*?)\)/g) || [];
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
          .replace(/\\\d{3}/g, (match) => {
            // Decode octal escape sequences
            const code = parseInt(match.slice(1), 8);
            return String.fromCharCode(code);
          });
        return content;
      })
      .filter(str => {
        // Filter out garbage: must have meaningful content
        const hasLetters = /[a-zA-Z]{2,}/.test(str);
        const notTooShort = str.length > 2;
        const notJustNumbers = !/^\d+$/.test(str);
        const notMetadata = !str.includes('D:') && !str.includes('ReportLab') && !str.includes('anonymous');
        return hasLetters && notTooShort && notJustNumbers && notMetadata;
      })
      .join(' ');
    
    if (parenText.trim().length > 50) {
      extractedParts.push(parenText);
    }
    
    // Method 2: Extract text from BT...ET blocks (PDF text objects)
    const btMatches = text.match(/BT[\s\S]*?ET/g) || [];
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
              .replace(/\\\d{3}/g, (match) => {
                const code = parseInt(match.slice(1), 8);
                return String.fromCharCode(code);
              });
            return content;
          })
          .filter(str => {
            const hasLetters = /[a-zA-Z]{2,}/.test(str);
            const notTooShort = str.length > 2;
            const notMetadata = !str.includes('D:') && !str.includes('ReportLab') && !str.includes('anonymous');
            return hasLetters && notTooShort && notMetadata;
          })
          .join(' ');
      })
      .filter(str => str.length > 0 && /[a-zA-Z]{3,}/.test(str))
      .join(' ');
    
    if (btText.trim().length > 50) {
      extractedParts.push(btText);
    }
    
    // Method 3: Extract text from stream objects
    const streamMatches = text.match(/stream[\s\S]*?endstream/g) || [];
    const streamText = streamMatches
      .map(stream => {
        // Try to extract readable text from stream
        const content = stream.replace(/stream|endstream/g, '').trim();
        // Look for text patterns
        const textPatterns = content.match(/[a-zA-Z]{3,}/g) || [];
        return textPatterns.join(' ');
      })
      .filter(str => str.length > 10)
      .join(' ');
    
    if (streamText.trim().length > 50) {
      extractedParts.push(streamText);
    }
    
    // Combine all extracted parts
    let combinedText = extractedParts.join(' ');
    
    // Clean up extracted text
    const cleanedText = combinedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:!?()@#&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Final validation: ensure we have meaningful content
    const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 2).length;
    const hasMeaningfulContent = wordCount > 10 && /[a-zA-Z]{3,}/.test(cleanedText);
    
    if (hasMeaningfulContent && cleanedText.length > 100) {
      console.log(`✅ Extracted enhanced text: ${cleanedText.length} characters, ${wordCount} words`);
      return cleanedText;
    } else {
      console.log(`⚠️  Enhanced extraction found limited content: ${cleanedText.length} chars, ${wordCount} words`);
      // Return empty if content is too limited
      return '';
    }
  } catch (error) {
    console.error('Error in enhanced text extraction:', error);
    return '';
  }
};

export default extractResumeText;
