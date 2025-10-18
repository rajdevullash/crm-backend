import nodemailer from 'nodemailer';
import config from '../config';


// Create a reusable transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Email templates
export const emailTemplates = {
  taskAssignment: (data: {
    taskTitle: string;
    assignedToName: string;
    assignedByName: string;
    description?: string;
    dueDate?: Date;
    priority?: string;
  }) => {
    const dueDateStr = data.dueDate
      ? new Date(data.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Not specified';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .task-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .task-details h3 { margin-top: 0; color: #667eea; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .priority-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .priority-high { background: #fee; color: #c33; }
          .priority-medium { background: #ffefc1; color: #c87c00; }
          .priority-low { background: #e0f5e9; color: #2d7a4f; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Task Assignment</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.assignedToName}</strong>,</p>
            <p>You have been assigned a new task by <strong>${data.assignedByName}</strong>.</p>
            
            <div class="task-details">
              <h3>${data.taskTitle}</h3>
              ${data.description ? `<p>${data.description}</p>` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Due Date:</span>
                <span class="detail-value">${dueDateStr}</span>
              </div>
              
              ${
                data.priority
                  ? `
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="priority-badge priority-${data.priority?.toLowerCase()}">${data.priority?.toUpperCase()}</span>
              </div>
              `
                  : ''
              }
              
              <div class="detail-row">
                <span class="detail-label">👤 Assigned By:</span>
                <span class="detail-value">${data.assignedByName}</span>
              </div>
            </div>
            
            <p>Please log in to your dashboard to view the complete details and start working on this task.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>CRM Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  leadAssignment: (data: {
    leadTitle: string;
    leadName: string;
    assignedToName: string;
    assignedByName: string;
    email?: string;
    phone?: string;
    source?: string;
    budget?: number;
  }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
          .lead-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .lead-details h3 { margin-top: 0; color: #11998e; }
          .detail-row { margin: 10px 0; }
          .detail-label { font-weight: bold; color: #555; }
          .detail-value { color: #333; }
          .budget-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; background: #e8f5e9; color: #2d7a4f; }
          .button { display: inline-block; padding: 12px 30px; background: #11998e; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👤 New Lead Assignment</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.assignedToName}</strong>,</p>
            <p>A new lead has been assigned to you by <strong>${data.assignedByName}</strong>.</p>
            
            <div class="lead-details">
              <h3>${data.leadTitle}</h3>
              
              <div class="detail-row">
                <span class="detail-label">👤 Name:</span>
                <span class="detail-value">${data.leadName}</span>
              </div>
              
              ${
                data.email
                  ? `
              <div class="detail-row">
                <span class="detail-label">📧 Email:</span>
                <span class="detail-value">${data.email}</span>
              </div>
              `
                  : ''
              }
              
              ${
                data.phone
                  ? `
              <div class="detail-row">
                <span class="detail-label">📞 Phone:</span>
                <span class="detail-value">${data.phone}</span>
              </div>
              `
                  : ''
              }
              
              ${
                data.source
                  ? `
              <div class="detail-row">
                <span class="detail-label">🌐 Source:</span>
                <span class="detail-value">${data.source}</span>
              </div>
              `
                  : ''
              }
              
              ${
                data.budget
                  ? `
              <div class="detail-row">
                <span class="detail-label">💰 Budget:</span>
                <span class="budget-badge">$${data.budget.toLocaleString()}</span>
              </div>
              `
                  : ''
              }
              
              <div class="detail-row">
                <span class="detail-label">👤 Assigned By:</span>
                <span class="detail-value">${data.assignedByName}</span>
              </div>
            </div>
            
            <p>Please log in to your dashboard to view the complete details and follow up with this lead.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>CRM Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

// Send email function
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `"CRM System" <${config.email.user}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw error - we don't want to break the main flow if email fails
  }
};

// Helper function to send task assignment email
export const sendTaskAssignmentEmail = async (data: {
  assignedToEmail: string;
  assignedToName: string;
  assignedByName: string;
  taskTitle: string;
  description?: string;
  dueDate?: Date;
  priority?: string;
}): Promise<void> => {
  const html = emailTemplates.taskAssignment({
    taskTitle: data.taskTitle,
    assignedToName: data.assignedToName,
    assignedByName: data.assignedByName,
    description: data.description,
    dueDate: data.dueDate,
    priority: data.priority,
  });

  await sendEmail(
    data.assignedToEmail,
    `New Task Assigned: ${data.taskTitle}`,
    html,
  );
};

// Helper function to send lead assignment email
export const sendLeadAssignmentEmail = async (data: {
  assignedToEmail: string;
  assignedToName: string;
  assignedByName: string;
  leadTitle: string;
  leadName: string;
  email?: string;
  phone?: string;
  source?: string;
  budget?: number;
}): Promise<void> => {
  const html = emailTemplates.leadAssignment({
    leadTitle: data.leadTitle,
    leadName: data.leadName,
    assignedToName: data.assignedToName,
    assignedByName: data.assignedByName,
    email: data.email,
    phone: data.phone,
    source: data.source,
    budget: data.budget,
  });

  await sendEmail(
    data.assignedToEmail,
    `New Lead Assigned: ${data.leadTitle}`,
    html,
  );
};
