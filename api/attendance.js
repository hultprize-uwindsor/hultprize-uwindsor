import { handleAttendance } from '../server/attendance.js'
export default async function handler(request, response) {
  return handleAttendance(request, response)
}
