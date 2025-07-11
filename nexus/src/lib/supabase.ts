import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Progress tracking functions
export async function updateNodeMastery(userId: string, nodeId: number, progress: number) {
    const { data, error } = await supabase
        .from('node_masteries')
        .upsert({
            user_id: userId,
            node_id: nodeId,
            progress,
            last_interaction: new Date().toISOString(),
            level: calculateMasteryLevel(progress)
        })
        .select();

    if (error) throw error;
    return data;
}

export async function getUserProgress(userId: string) {
    const { data: masteries, error: masteriesError } = await supabase
        .from('node_masteries')
        .select('*')
        .eq('user_id', userId);

    if (masteriesError) throw masteriesError;

    const { data: domainProgress, error: domainError } = await supabase
        .from('domain_progress')
        .select('*')
        .eq('user_id', userId);

    if (domainError) throw domainError;

    return {
        nodeMasteries: masteries,
        domainProgress: domainProgress
    };
}

// Helper function to calculate mastery level based on progress
function calculateMasteryLevel(progress: number): number {
    if (progress >= 100) return 5; // Mastered
    if (progress >= 75) return 4;  // Proficient
    if (progress >= 50) return 3;  // Practiced
    if (progress >= 25) return 2;  // Learning
    if (progress > 0) return 1;    // Discovered
    return 0;                      // Undiscovered
} 