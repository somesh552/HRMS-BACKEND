import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

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
              We are pleased to inform you that your employee registration
              has been successfully completed.
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
                href="${process.env.HRMS_LOGIN_URL}"
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
              For security reasons, please change your temporary password
              after your first login.
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

      return {
        success: true,
        message: 'Welcome email sent successfully',
      };

    } catch (error) {
      console.error('Email sending failed:', error);

      throw new InternalServerErrorException(
        'Employee account created, but welcome email could not be sent',
      );
    }
  }
}