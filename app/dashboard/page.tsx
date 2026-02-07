'use client';

import { useEffect } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth-client';

export default function DashboardGateway(){
    const router = useRouter();

    useEffect(() => {
        async function checkAuth(){
            const { data: { user }} = await supabase.auth.getUser();
            const role = user?.user_metadata?.role;
            
            if(!user){
                router.push ('/login');
            }

            if(role === 'veterinarian'){
                router.push('/veterinarian/dashboard');
            }
            else if(role === 'admin'){
                router.push('/admin/dashboard');
            }
            else if(role === 'client' || role === 'pet_owner'){
                router.push('/client/dashboard');
            }
        }
        checkAuth();
    }, [router]);

    return <div className="p-10 text-center">Redirecting you...</div>;
}