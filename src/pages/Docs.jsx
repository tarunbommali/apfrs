import React from 'react';

const steps = [
  {
    title: '1. Gather SMTP credentials',
    points: [
      'Use a mailbox that allows SMTP (e.g., Gmail with App Password or your institutional relay).',
      'Collect host, port, whether SSL/TLS is required, and the username/password.',
      <>
        For Gmail:{' '}
        <a
          href="https://myaccount.google.com/signinoptions/twosv"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 font-medium"
        >
          enable 2FA
        </a>
        {', '}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800 font-medium"
        >
          create an App Password
        </a>
        {', and copy the 16-character key.'}
      </>
    ]
  },
  {
    title: '2. Start the project servers',
    points: [
      'Install dependencies once with `npm install` inside the project root.',
      'Run `npm run server` (or `node server.js`) to start the Express SMTP relay on port 4000.',
      'In a second terminal run `npm run dev` to launch the Vite frontend.'
    ]
  },
  {
    title: '3. Configure SMTP in the UI',
    points: [
      'Open the app at `http://localhost:5173` and upload your attendance file.',
      'Click Configure SMTP in the header to open the modal.',
      'Fill host, port, secure flag, username, from name, and password/app password, then save.'
    ]
  },
  {
    title: '4. Test before sending bulk email',
    points: [
      'Use the Send Test Email button in the modal; check the toast/error message for status.',
      'If you see 535/534 errors, verify the username and regenerate the app password.',
      'Only when the test succeeds should you send per-faculty or bulk emails from summary views.'
    ]
  }
];

const Docs = () => {
  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">SMTP Setup Quickstart</h1>
        <p className="text-gray-600 mt-2">
          Follow these steps to enable email delivery for attendance reports across the project.
        </p>
      </header>

      <section className="space-y-4">
        {steps.map((step) => (
          <article
            key={step.title}
            className="bg-white rounded-2xl p-5 shadow border border-gray-100"
          >
            <h2 className="text-lg font-semibold text-gray-800">{step.title}</h2>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              {step.points.map((point, idx) => (
                <li key={idx} className="leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <footer className="bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl p-4 text-sm">
        Need a refresher later? Reopen Configure SMTP to update credentials, then rerun the test
        email to confirm everything still works.
      </footer>
    </div>
  );
};

export default Docs;
