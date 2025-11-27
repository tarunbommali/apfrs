import React from 'react';
import PageLayout from './PageLayout';

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
					className="text-sky-600 underline hover:text-sky-500 font-medium"
				>
					enable 2FA
				</a>
				{', '}
				<a
					href="https://myaccount.google.com/apppasswords"
					target="_blank"
					rel="noopener noreferrer"
					className="text-sky-600 underline hover:text-sky-500 font-medium"
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
			'Open the app at `http://localhost:5173` and navigate to the Configure SMTP page.',
			'Fill host, port, secure flag, username, and password/app password, then save.',
			'The configuration is stored locally in your browser.'
		]
	},
	{
		title: '4. Test before sending bulk email',
		points: [
			'Use the "Send test email" button. Check for a success message.',
			'If you see 535/534 errors, verify the username and regenerate the app password.',
			'Only when the test succeeds should you send per-faculty or bulk emails from the summary views.'
		]
	}
];

const Docs = () => {
	const sidebarContent = (
		<div className="space-y-6">
			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
				<h2 className="text-xl font-bold text-slate-900 mb-6">SMTP Setup Guide</h2>
				<nav className="space-y-3">
					<div className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-2">
						Quick Navigation
					</div>
					{steps.map((step, index) => (
						<a
							key={step.title}
							href={`#step-${index + 1}`}
							className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
						>
							<div className="flex items-start space-x-3">
								<div className="shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
									{index + 1}
								</div>
								<div>
									<h3 className="text-sm font-semibold text-slate-800 leading-tight">
										{step.title.replace(/^\d+\.\s/, '')}
									</h3>
									<p className="text-xs text-slate-500 mt-1 line-clamp-2">
										{typeof step.points[0] === 'string' ? step.points[0].substring(0, 60) + '...' : 'Configuration details...'}
									</p>
								</div>
							</div>
						</a>
					))}
				</nav>
			</section>
			<section className="mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200">
				<h4 className="text-sm font-semibold text-sky-700 mb-2">Need Help?</h4>
				<p className="text-xs text-slate-600">
					Follow each step carefully. Test email functionality before sending bulk reports.
				</p>
			</section>
		</div>
	);

	const bodyContent = (
		<div className="space-y-6 pt-16">
			<header className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-lg">
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">SMTP Setup Quickstart</h1>
				<p className="text-slate-600 mt-2 max-w-3xl">
					Follow these steps to enable email delivery for attendance reports across the project.
				</p>
			</header>

			<section className="space-y-4">
				{steps.map((step, index) => (
					<article
						id={`step-${index + 1}`}
						key={step.title}
						className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg scroll-mt-20"
					>
						<div className="flex items-center mb-4">
							<div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
								{index + 1}
							</div>
							<h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
						</div>
						<ul className="list-disc list-inside text-slate-700/90 mt-2 space-y-2 pl-4">
							{step.points.map((point, idx) => (
								<li key={idx} className="leading-relaxed">
									{point}
								</li>
							))}
						</ul>
					</article>
				))}
			</section>

			<footer className="bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl p-4 text-sm">
				Need a refresher later? Reopen Configure SMTP to update credentials, then rerun the test
				email to confirm everything still works.
			</footer>
		</div>
	);

	return (
		<PageLayout
			Sidebar={sidebarContent}
			Body={bodyContent}
		/>
	);
};

export default Docs;