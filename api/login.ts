/**
 * Ruta plana: Vercel + Vite a veces no exponen bien rutas anidadas tipo /api/auth/login.
 * POST /api/login — las rutas antiguas se redirigen con vercel.json.
 */
import loginHandler, { config } from './_lib/routes/loginHandler'

export default loginHandler
export { config }
