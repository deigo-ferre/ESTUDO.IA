
import { supabase } from './supabaseClient';
import { User, SavedExam, SavedSchedule, UserSettings, ExamConfig, ExamState, ExamPerformance, StudyProfile, StudyScheduleResult } from '../types';

// Este serviço substitui o storageService.ts quando a migração estiver completa.
// Nota: Todas as funções aqui são ASSÍNCRONAS (Promise), ao contrário do localStorage.

// --- USER & AUTH ---

export const dbGetUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) return null;

    return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar_url,
        planType: profile.plan_type,
        tokensConsumed: profile.tokens_consumed,
        isAdmin: profile.is_admin,
        usage: profile.usage_stats
    };
};

export const dbUpdateUserUsage = async (userId: string, usage: any) => {
    const { error } = await supabase
        .from('profiles')
        .update({ usage_stats: usage })
        .eq('id', userId);
    if (error) console.error('Error updating usage:', error);
};

// --- EXAMS ---

export const dbSaveExam = async (userId: string, exam: SavedExam) => {
    // Upsert (Insert or Update)
    const { data, error } = await supabase
        .from('exams')
        .upsert({
            id: exam.id,
            user_id: userId,
            status: exam.status,
            config: exam.config,
            state: exam.state,
            performance: exam.performance,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const dbGetExams = async (userId: string): Promise<SavedExam[]> => {
    const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    // Map DB columns back to Frontend Types if needed
    return data.map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status,
        config: row.config,
        state: row.state,
        performance: row.performance
    }));
};

// --- SCHEDULES ---

export const dbSaveSchedule = async (userId: string, schedule: SavedSchedule) => {
    const { data, error } = await supabase
        .from('schedules')
        .insert({
            id: schedule.id,
            user_id: userId,
            profile_data: schedule.profile,
            result_data: schedule.result,
            completed_items: schedule.completedItems,
            archived: schedule.archived,
            created_at: schedule.createdAt
        });
    
    if (error) throw error;
    return data;
};

export const dbGetSchedules = async (userId: string): Promise<SavedSchedule[]> => {
    const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => ({
        id: row.id,
        createdAt: row.created_at,
        profile: row.profile_data,
        result: row.result_data,
        completedItems: row.completed_items,
        archived: row.archived
    }));
};

// --- MIGRATION HELPER ---
// Função para enviar dados do LocalStorage para o Supabase na primeira execução
export const migrateLocalToCloud = async () => {
    const localUser = localStorage.getItem('enem_ai_user_session');
    if (!localUser) return;
    
    const userObj = JSON.parse(localUser);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Migrar Exames
        const localExams = JSON.parse(localStorage.getItem('enem_ai_exams') || '[]');
        for (const exam of localExams) {
            await dbSaveExam(user.id, exam);
        }
        console.log(`Migrated ${localExams.length} exams to cloud.`);
    }
};
