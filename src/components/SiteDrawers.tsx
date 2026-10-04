import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Link } from './PageLink'
import Drawer from './Drawer'
import ContactEnquiry from './ContactEnquiry'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'
import { TEAM } from '../data/team'
import { committee } from '../data/committee'
import { YEAR_ONE_PHOTOS } from '../data/assets'
import { Copy } from './PageParts'

export default function SiteDrawers() {
  const [params,setParams]=useSearchParams()
  const location=useLocation()
  const navigate=useNavigate()
  const currentPartner=COMMUNITY_PARTNERS.find(p=>p.slug===params.get('partner'))
  const currentPerson=committee.find(p=>p[3]===params.get('member'))
  const currentPhotoIndex=params.has('photo')?Number(params.get('photo')):-1
  const currentPhoto=Number.isInteger(currentPhotoIndex)?YEAR_ONE_PHOTOS[currentPhotoIndex]:undefined
  const open=!!(params.get('enquiry')||currentPartner||currentPerson||currentPhoto)
  const [retainedSearch,setRetainedSearch]=useState<string|null>(open?location.search:null)
  if(open&&retainedSearch!==location.search)setRetainedSearch(location.search)
  const visibleParams=open?params:new URLSearchParams(retainedSearch??'')
  const partner=COMMUNITY_PARTNERS.find(p=>p.slug===visibleParams.get('partner'))
  const person=committee.find(p=>p[3]===visibleParams.get('member'))
  const enquiry=visibleParams.get('enquiry')
  const photoIndex=visibleParams.has('photo')?Number(visibleParams.get('photo')):-1
  const photo=Number.isInteger(photoIndex)?YEAR_ONE_PHOTOS[photoIndex]:undefined
  const exited=()=>{if(!open)setRetainedSearch(null)}
  const close=()=>{if(location.state?.drawer){navigate(-1);return}const next=new URLSearchParams(params);['partner','member','enquiry','photo'].forEach(key=>next.delete(key));setParams(next,{replace:true})}
  if(enquiry) return <Drawer title={enquiry==='partnership'?'Let’s work together':'Ask the team'} open={open} onClose={close} onExited={exited}><ContactEnquiry initialTopic={enquiry}/></Drawer>
  if(partner) return <Drawer title="Partner story" open={open} onClose={close} onExited={exited}><h3>{partner.name}</h3><p className="drawer-role">{partner.subtitle}</p>{partner.logo&&<img className="partner-drawer-logo" src={partner.logo} alt={`${partner.name} logo`}/>}<Copy paragraphs={partner.withUs}/><div className="drawer-actions"><Link className="btn btn--primary" to={`/partners/${partner.slug}`}>Explore the partnership ↗</Link><a className="text-link" href={partner.url} target="_blank" rel="noopener noreferrer">Their website ↗</a></div></Drawer>
  if(person){const bio=TEAM.find(p=>p.name===person[0]);return <Drawer title="The Team" open={open} onClose={close} onExited={exited}><h3>{person[0]}</h3><p className="drawer-role">{person[1]}</p><img src={`/images/team/${person[3]}.png`} alt={person[0]}/>{bio&&<p>{bio.bio}</p>}<a className="btn btn--primary" href={`mailto:${person[2]}`}>Email {person[0].split(' ')[0]} ↗</a></Drawer>}
  if(photo) return <Drawer title="Year one in pictures" open={open} onClose={close} onExited={exited}><img src={photo.src} alt={photo.alt}/><p>{photo.caption}</p><nav className="drawer-actions" aria-label="Photo navigation"><button className="btn btn--secondary" disabled={photoIndex===0} onClick={()=>{const next=new URLSearchParams(visibleParams);next.set('photo',String(photoIndex-1));setParams(next,{replace:true,state:location.state})}}>← Previous</button><button className="btn btn--secondary" disabled={photoIndex===YEAR_ONE_PHOTOS.length-1} onClick={()=>{const next=new URLSearchParams(visibleParams);next.set('photo',String(photoIndex+1));setParams(next,{replace:true,state:location.state})}}>Next →</button></nav></Drawer>
  return null
}
