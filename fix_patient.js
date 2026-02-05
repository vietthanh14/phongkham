
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eepuidxxtvcnxrcvmuhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHVpZHh4dHZjbnhyY3ZtdWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjMwMzEsImV4cCI6MjA4NTc5OTAzMX0.G6f79KaWfav0Dy4Zw_gZ9Vvd89C2NPqw6n3WWC4_y74';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log("Fixing 'Ty Văn Quỳnh'...");

    // Find visits for Ty Van Quynh with status Examing
    // We already know the ID from previous step but let's be safe
    const { data: patients } = await supabase.from('patients').select('id').ilike('full_name', '%quỳnh%');

    if (patients && patients.length > 0) {
        for (const p of patients) {
            const { error } = await supabase
                .from('visits')
                .update({ status: 'Waiting for Exam', doctor_by: null }) // Reset to waiting
                .eq('patient_id', p.id)
                .eq('status', 'Examing');

            if (!error) console.log(`Reset visits for patient ${p.id} to Waiting for Exam`);
            else console.error(error);
        }
    }
}

fix();
