import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'APP CONSTRUCCIÓN | Expedientes',description:'Dirección integral de proyectos de construcción. Expediente arquitectónico.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>;}
