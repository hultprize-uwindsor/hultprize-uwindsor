export interface Partner {
  name: string
  role?: string
  url: string
  logo?: string // path under /public/images/partners/, shown on a white box when set
  individual?: boolean
}

export const PARTNERS: Partner[] = [
  { name: 'WEtech Alliance', role: 'Technology and Innovation Ecosystem Partner', url: 'https://www.wetech-alliance.com/', logo: '/images/partners/wetech-alliance.png' },
  { name: 'Research and Innovation Office', role: 'University of Windsor, Institutional Research Partner', url: 'https://www.uwindsor.ca/research/', logo: '/images/partners/uwindsor.png' },
  { name: 'UWSA', role: "University of Windsor Students’ Alliance", url: 'https://uwsa.ca/', logo: '/images/partners/uwsa.png' },
  { name: 'GSS', role: 'Graduate Student Society, University of Windsor', url: 'https://uwindsorgss.ca/', logo: '/images/partners/gss.png' },
  { name: 'Alumni Association', role: 'University of Windsor Alumni Association', url: 'https://www.uwindsor.ca/alumni/', logo: '/images/partners/uwindsor.png' },
  { name: 'Student Centre', role: 'University of Windsor Student Centre', url: 'https://www.uwsa.ca/student-centre', logo: '/images/partners/uwsa.png' },
  { name: 'Picsume', role: 'Corporate Sponsor and Startup Ecosystem Supporter', url: 'https://www.picsume.com/', logo: '/images/partners/picsume.png' },
  { name: 'City of Windsor', role: 'Municipal Government Partner', url: 'https://www.citywindsor.ca/', logo: '/images/partners/city-of-windsor.png' },
  { name: 'Mayor Drew Dilkens', role: 'Local Government Representative and Advocate', url: 'https://www.citywindsor.ca/mayor-and-council/mayors-office', individual: true },
  { name: 'Small Business and Entrepreneurship Centre', role: 'Small Business Development and Entrepreneurship Partner', url: 'https://www.webusinesscentre.com/', logo: '/images/partners/uwindsor.png' },
]

// Only organisations explicitly marked confirmed in the supplied brief.
export const CURRENT_PARTNERS: Partner[] = [
  { name: 'Fusion', url: 'https://www.uwindsor.ca/', logo: '/images/partners/uwindsor.png' },
  { name: 'Sterling Cybersecurity and Advisory Group', url: 'https://www.sterlinginfo.com/', logo: '/images/partners/sterling-cybersecurity-advisory-group.png' },
  { name: 'Hypercare', url: 'https://www.hypercare.com/', logo: '/images/partners/hypercare.png' },
]
