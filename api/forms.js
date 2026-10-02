import { handleForms } from '../server/forms.js'

export default async function handler(request, response) {
  return handleForms(request, response)
}
