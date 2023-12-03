const nodemailer = require("nodemailer");

const sendInstructionEmail = (
  to,
  subject,
  message,
  receiverName,
  trainer,
  slot
) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  transporter.sendMail({
    from: {
      name: "FitSync",
      address: process.env.SMTP_MAIL,
    },
    to: to,
    subject: subject,
    html: `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Invitation</title>
        <style>
          body,
          h1,
          h2,
          h3,
          p,
          img {
            margin: 0;
            padding: 0;
          }
    
          body {
            font-family: "Arial", sans-serif;
            line-height: 1.6;
          }
          .max-w-2xl {
            max-width: 42rem;
          }
    
          .px-6 {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
    
          .py-8 {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
    
          .mx-auto {
            margin-left: auto;
            margin-right: auto;
          }
    
          .bg-white {
            background-color: #ffffff;
          }
    
          .dark-bg-gray-900 {
            background-color: #1a202c;
          }
    
          .w-auto {
            width: 30%;
          }
    
          .mt-8 {
            margin-top: 2rem;
          }
    
          .text-gray-700 {
            color: #4a5568;
          }
    
          .dark-text-gray-200 {
            color: #edf2f7;
          }
    
          .leading-loose {
            line-height: 1.6;
          }
    
          .text-gray-600 {
            color: #718096;
          }
    
          .dark-text-gray-300 {
            color: #a0aec0;
          }
    
          .font-semibold {
            font-weight: 600;
          }
    
          .capitalize {
            text-transform: capitalize;
          }
    
          .text-sm {
            font-size: 0.875rem;
          }
    
          .font-medium {
            font-weight: 500;
          }
    
          .tracking-wider {
            letter-spacing: 0.05em;
          }
    
          .text-white {
            color: #ffffff;
          }
    
          .transition-colors {
            transition-property: color;
          }
    
          .duration-300 {
            transition-duration: 0.3s;
          }
    
          .transform {
            transform: none;
          }
    
          .bg-blue-600 {
            background-color: #3182ce;
          }
    
          .rounded-lg {
            border-radius: 0.375rem;
          }
    
          .hover\:bg-blue-500:hover {
            background-color: #2c5282;
          }
    
          .focus\:outline-none:focus {
            outline: 0;
          }
    
          .focus\:ring {
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
          }
    
          .focus\:ring-blue-300:focus {
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
          }
    
          .focus\:ring-opacity-80:focus {
            box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.25);
          }
    
          .mt-4 {
            margin-top: 1rem;
          }
    
          .mt-8 {
            margin-top: 2rem;
          }
    
          .text-purple-500 {
            color: #6b46c1;
          }
    
          .mt-3 {
            margin-top: 0.75rem;
          }
    
          .text-gray-500 {
            color: #a0aec0;
          }
    
          .dark-text-gray-400 {
            color: #cbd5e0;
          }
    
          .hover\:underline:hover {
            text-decoration: underline;
          }
    
          .text-blue-600 {
            color: #3182ce;
          }
    
          .dark-text-blue-400 {
            color: #4299e1;
          }
    
          .btn-redesign {
            padding: 10px;
            border: none;
            box-shadow: none;
            cursor: pointer;
          }
    
          /* Responsive Styles */
          @media screen and (max-width: 640px) {
            .max-w-2xl {
              max-width: 100%;
            }
    
            .px-6 {
              padding-left: 1rem;
              padding-right: 1rem;
            }
    
            .py-8 {
              padding-top: 1.5rem;
              padding-bottom: 1.5rem;
            }
          }
        </style>
      </head>
    
      <body>
        <section class="max-w-2xl px-6 py-8 mx-auto bg-white dark:bg-gray-900">
          <header>
            <a href="#">
              <img
                class="w-auto h-7 sm:h-8"
                src="https://i.ibb.co/q7L0zZ5/fit-Sync-prev-ui.png"
                alt=""
              />
            </a>
          </header>
    
          <main class="mt-8">
            <h2 class="text-gray-700 dark:text-gray-200">Hi ${receiverName},</h2>

            <p class="mt-2 leading-loose text-gray-600 dark:text-gray-300">
            Trainer: ${trainer}
           </p> 

           <p class="mt-2 leading-loose text-gray-600 dark:text-gray-300">
           Slot: ${slot}
          </p> 
    
            <p class="mt-2 leading-loose text-gray-600 dark:text-gray-300">
             ${message}
            </p>  
    
    
            <p class="mt-8 text-gray-600 dark:text-gray-300">
              Thanks, <br />
              FitSync Team
            </p>
          </main>
        </section>
      </body>
    </html>`,
  });
};

module.exports = { sendInstructionEmail };
