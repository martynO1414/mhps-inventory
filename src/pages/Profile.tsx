import { useState } from 'react';
import { User as UserIcon, Mail, Calendar, Save } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Card, Button, Input, ErrorBanner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', profile?.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    await refreshProfile();
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) {
    return (
      <div>
        <PageHeader title="Profile" />
        <Card className="p-6">
          <p className="text-sm text-slate-500">Loading profile...</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account information" />

      <div className="max-w-lg space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">{profile.name || 'Unnamed'}</div>
              <div className="text-sm text-slate-500">{profile.email}</div>
            </div>
          </div>

          <div className="space-y-3 text-sm border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Member since {formatDate(profile.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span className="capitalize">Role: {profile.role}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Edit Name</h3>
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
          {saved && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
              Name updated successfully.
            </div>
          )}
          <Input label="Display Name" value={name} onChange={setName} hint="This name is used when recording equipment transactions." />
          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving || name.trim() === profile.name}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
