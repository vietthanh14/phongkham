
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eepuidxxtvcnxrcvmuhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHVpZHh4dHZjbnhyY3ZtdWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjMwMzEsImV4cCI6MjA4NTc5OTAzMX0.G6f79KaWfav0Dy4Zw_gZ9Vvd89C2NPqw6n3WWC4_y74';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Searching for 'Ty Văn Quỳnh'...");

    // 1. Find Patient
    const { data: patients } = await supabase.from('patients').select('id, full_name').ilike('full_name', '%quỳnh%');

    if (patients && patients.length > 0) {
        for (const p of patients) {
            console.log(`FOUND PATIENT: ${p.full_name} (${p.id})`);

            // 2. Find Visits
            const { data: visits } = await supabase
                .from('visits')
                .select('id, status, doctor_by, created_at')
                .eq('patient_id', p.id);

            visits.forEach(v => {
                console.log(`-- VISIT: Status=[${v.status}], Doctor=[${v.doctor_by}], Time=[${v.created_at}]`);
            });
        }
    } else {
        console.log("Patient NOT FOUND");
    }
}

check();
