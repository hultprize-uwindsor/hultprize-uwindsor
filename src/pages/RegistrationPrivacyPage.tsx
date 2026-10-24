import { PageLayout, Section } from '../components/PageParts'
import { SITE } from '../data/site'

export default function RegistrationPrivacyPage() {
  return <PageLayout title="Event registration privacy" subtitle="How we use the information you share when attending our events."><Section><div className="prose">
    <p>Hult Prize at UWindsor collects your name, email, attendee category and relevant student or organisation details to manage event registrations, capacity, waitlists, check-ins and essential event messages. Team names help us plan; every person registers individually.</p>
    <p>Dietary and accessibility requests are optional. Share only what organisers need to support your attendance. These details are available to authorised organisers with attendance-support responsibilities and are excluded from general roster exports.</p>
    <p>We use Google Sheets and Google Apps Script to store registration records and send essential emails, and Vercel to serve the website and its API. Secure management links let you view and update your own registrations. Do not forward these private links.</p>
    <p>Broader programme updates require your separate, optional consent. Declining them does not affect event registration. Your contact details are not automatically shared with sponsors or partners. Any future contact sharing will require separate, specific consent.</p>
    <p>Our retention schedule removes dietary and accessibility details 30 days after your last registered event and removes identifiable attendance records 12 months after the season’s last event. We retain aggregate attendance totals for programme reporting. Organisers must apply the same schedule to downloaded rosters and any separately retained copies.</p>
    <p>You can cancel individual registrations or update attendance-support details through the secure link sent to your email. To request access, correction, deletion or withdrawal from optional updates, email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
    <p>Event attendance is separate from competition entry. The official competition registration site has its own privacy information.</p>
  </div></Section></PageLayout>
}
