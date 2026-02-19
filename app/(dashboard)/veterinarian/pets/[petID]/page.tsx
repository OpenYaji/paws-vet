import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Pet {
      id: string;
      name: string;
      species: string;
      breed?: string;
      color?: string;
      weight?: number;
      gender?: string;
      birthdate?: string; // or date_of_birth
      owner_id: string;
      client_profiles?: {
        first_name: string;
        last_name: string;
        phone: string;
        email: string;
    };
}

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PetPage(
  { params }: { params: { petID: string } }) {
    const resolvedParams = await params;
    const petId = resolvedParams.petID;

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.user_metadata.role !== 'veterinarian') {
      redirect('/login');
    }

    const [petResult, medicalResult] = await Promise.all([
      adminSupabase
    .from('pets')
    .select(`
      *,
      client_profiles (
        first_name,
        last_name,
        phone,
        users(
          id,
          email
          )
      )
    `)
    .eq('id', petId)
    .single(),

    adminSupabase
      .from('pet_medical_summary')
      .select(`
        total_visit,
        last_visit_date,
        active_prescriptions,
        vaccination_count,
        next_vaccination_due`)
      .eq('pet_id', petId)
      .maybeSingle()
    ]);
    
    const pet = petResult.data;
    const medicalInformation = medicalResult.data;

    if (petResult.error || !pet) {
      console.error('Error fetching pet:', petResult.error);
      notFound();
    }

    return(
      <div className="space-y-6 p-6">
      {/* Header / Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/veterinarian/pets">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
          <p className="text-muted-foreground">Patient Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Basic Info */}
        <Card>
            <CardHeader>
                <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block">Species</span>
                        <span className="font-medium capitalize">{pet.species}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Breed</span>
                        <span className="font-medium">{pet.breed || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Gender</span>
                        <span className="font-medium capitalize">{pet.gender || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Weight</span>
                        <span className="font-medium">{pet.weight ? `${pet.weight} kg` : 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Color</span>
                        <span className="font-medium">{pet.color || 'N/A'}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Card 2: Owner Info */}
        <Card>
            <CardHeader>
                <CardTitle>Owner Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block">Name</span>
                        <span className="font-medium">
                           {pet.client_profiles?.first_name} {pet.client_profiles?.last_name}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Contact</span>
                        <span className="font-medium">{pet.client_profiles?.phone || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Email</span>
                        <span className="font-medium">{pet.client_profiles?.email || 'N/A'}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Card 3: Medical Information */}
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-center md:text-left">
                    <div>
                        <span className="text-gray-500 block">Total Visits</span>
                        <span className="font-medium">
                           {medicalInformation?.total_visit || 'N/A'}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Last Visit Date</span>
                        <span className="font-medium">{medicalInformation?.last_visit_date || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Next Vaccination Due</span>
                        <span className="font-medium">{medicalInformation?.next_vaccination_due || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Active Prescriptions</span>
                        <span className="font-medium">{medicalInformation?.active_prescriptions || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Vaccination Count</span>
                        <span className="font-medium">{medicalInformation?.vaccination_count || 'N/A'}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
    );
}