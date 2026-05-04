// Mock SSO directory — stand-in until real SSO comes online (Okta/Auth0 etc.).
// See project memory: SSO setup pending from Soni (CloudFront + S3 + SSO).

export const users = [
  { id: 'u1', name: 'Amy Cook',         role: 'Admin',        email: 'amy.cook@odyssey.com',         avatarUrl: 'https://i.pravatar.cc/64?img=47' },
  { id: 'u2', name: 'David Johns',      role: 'Operations',   email: 'david.johns@odyssey.com',      avatarUrl: 'https://i.pravatar.cc/64?img=12' },
  { id: 'u3', name: 'Janardhana K.',    role: 'Domain Lead',  email: 'janardhana.k@odyssey.com',     avatarUrl: 'https://i.pravatar.cc/64?img=33' },
  { id: 'u4', name: 'Manuela Ramirez',  role: 'Designer',     email: 'manuela.ramirez@odyssey.com',  avatarUrl: 'https://i.pravatar.cc/64?img=44' },
]

// Active session — first entry. Swap the index to simulate different roles in dev.
export const currentUser = users[0]

export function useCurrentUser() {
  return currentUser
}
