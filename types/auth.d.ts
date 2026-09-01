declare module '#auth-utils' {
  interface User {
    loggedIn: true
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
