import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: false,

      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  // =========================================================
  // 1. EMPLOYEE CREATED - SEND WELCOME EMAIL
  // =========================================================
  async sendEmployeeWelcomeMail(
    employeeEmail: string,
    employeeName: string,
    employeeCode: string,
    temporaryPassword: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: `"HR Department" <${process.env.MAIL_USER}>`,
        to: employeeEmail,

        subject: 'Welcome to Our Company - Your HRMS Account',

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background-color: #ffffff;
          ">

            <h2 style="color: #2563eb;">
              Welcome to Our Company!
            </h2>

            <p>
              Dear <strong>${employeeName}</strong>,
            </p>

            <p>
              We are pleased to inform you that your employee
              registration has been successfully completed.
            </p>

            <p>
              Welcome to the team! You are now officially part of
              <strong>${process.env.COMPANY_NAME || 'Our Company'}</strong>.
            </p>

            <h3 style="margin-top: 25px;">
              Your HRMS Login Details
            </h3>

            <table style="
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            ">

              <tr>
                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                  background: #f8fafc;
                ">
                  <strong>Employee ID</strong>
                </td>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                ">
                  ${employeeCode}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                  background: #f8fafc;
                ">
                  <strong>Email</strong>
                </td>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                ">
                  ${employeeEmail}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                  background: #f8fafc;
                ">
                  <strong>Temporary Password</strong>
                </td>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                ">
                  ${temporaryPassword}
                </td>
              </tr>

            </table>

            <div style="margin-top: 25px;">

              <a
                href="${process.env.HRMS_LOGIN_URL || '#'}"
                style="
                  display: inline-block;
                  padding: 12px 22px;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                "
              >
                Login to HRMS
              </a>

            </div>

            <p style="margin-top: 25px;">
              For security reasons, please change your temporary
              password after your first login.
            </p>

            <p>
              Please do not share your login credentials with anyone.
            </p>

            <p>
              If you have any issues accessing the HRMS portal,
              please contact the HR/IT team.
            </p>

            <p style="margin-top: 25px;">
              We are happy to have you as part of our team.
            </p>

            <p>
              Best regards,<br>
              <strong>HR Department</strong><br>
              ${process.env.COMPANY_NAME || 'Our Company'}
            </p>

          </div>
        `,
      });

      console.log(
        `Welcome email sent successfully to ${employeeEmail}`,
      );

      return {
        success: true,
        message: 'Welcome email sent successfully',
      };
    } catch (error) {
      console.error(
        'Welcome email sending failed:',
        error,
      );

      throw new InternalServerErrorException(
        'Employee account created, but welcome email could not be sent',
      );
    }
  }
  async sendEmployeeCreatedHrMail(
    employeeName: string,
    employeeCode: string,
    employeeEmail: string,
  ) {
    const hrEmail = process.env.HR_EMAIL;

    if (!hrEmail) {
      throw new Error('HR_EMAIL is missing in .env');
    }

    await this.transporter.sendMail({
      from: `"HR Department" <${process.env.MAIL_USER}>`,
      to: hrEmail,
      subject: 'Employee Created Successfully',

      text: `
Hello HR Team,

The employee has been created successfully.

Employee Name: ${employeeName}
Employee ID: ${employeeCode}
Employee Email: ${employeeEmail}

Regards,
HR Department
    `,
    });

    console.log(`Employee creation email sent to HR: ${hrEmail}`);
  }

  // =========================================================
  // 2. TEST GMAIL
  // =========================================================
  async sendTestMail(to: string) {
    try {
      await this.transporter.sendMail({
        from: `"HR Department" <${process.env.MAIL_USER}>`,
        to,

        subject: 'HRMS Test Email',

        text: 'Gmail email service is working successfully.',
      });

      console.log(
        `Test email sent successfully to ${to}`,
      );

      return {
        success: true,
        message: 'Test email sent successfully',
      };
    } catch (error) {
      console.error(
        'Test email sending failed:',
        error,
      );

      throw new InternalServerErrorException(
        'Failed to send test email',
      );
    }
  }

  // =========================================================
  // 3. RESIGNATION COMPLETED - SEND EMAIL TO HR
  // =========================================================
  async sendResignationMail(
    to: string,
    employeeName: string,
    employeeId: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: `"HR Department" <${process.env.MAIL_USER}>`,

        to,

        subject: 'Employee Resignation Completed',

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background-color: #ffffff;
          ">

            <h2 style="color: #2563eb;">
              Employee Resignation Completed
            </h2>

            <p>
              Dear HR Team,
            </p>

            <p>
              The resignation process for the following employee
              has been completed successfully.
            </p>

            <table style="
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            ">

              <tr>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                  background: #f8fafc;
                ">
                  <strong>Employee Name</strong>
                </td>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                ">
                  ${employeeName}
                </td>

              </tr>

              <tr>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                  background: #f8fafc;
                ">
                  <strong>Employee ID</strong>
                </td>

                <td style="
                  padding: 12px;
                  border: 1px solid #ddd;
                ">
                  ${employeeId}
                </td>

              </tr>

            </table>

            <p style="margin-top: 25px;">
              The resignation details have been recorded
              in the HRMS.
            </p>

            <p>
              Please check the HRMS system for complete details.
            </p>

            <p style="margin-top: 25px;">
              Best regards,<br>
              <strong>HR Department</strong><br>
              ${process.env.COMPANY_NAME || 'Our Company'}
            </p>

          </div>
        `,
      });

      console.log(
        `Resignation email sent successfully to ${to}`,
      );

      return {
        success: true,
        message: 'Resignation email sent successfully',
      };
    } catch (error) {
      console.error(
        'Resignation email sending failed:',
        error,
      );

      throw new InternalServerErrorException(
        'Resignation completed, but email could not be sent',
      );
    }
  }
}