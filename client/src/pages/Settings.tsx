import { useState } from 'react';
import { Save, User, Bell, Shield, Database, Palette } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState({
    // Profile
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc',
    
    // Notifications
    emailNotifications: true,
    workflowAlerts: true,
    weeklyReports: false,
    
    // Security
    twoFactorAuth: false,
    sessionTimeout: '30',
    
    // Appearance
    compactMode: false,
    
    // Database
    autoBackup: true,
    backupFrequency: 'daily'
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Manage your account and application preferences</p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your personal information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
              <input
                type="text"
                value={settings.company}
                onChange={(e) => setSettings({ ...settings, company: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage how you receive updates</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Email Notifications</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your workflows</div>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Workflow Alerts</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Get notified when workflows complete or fail</div>
              </div>
              <input
                type="checkbox"
                checked={settings.workflowAlerts}
                onChange={(e) => setSettings({ ...settings, workflowAlerts: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Weekly Reports</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Receive weekly summary of your automation</div>
              </div>
              <input
                type="checkbox"
                checked={settings.weeklyReports}
                onChange={(e) => setSettings({ ...settings, weeklyReports: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Keep your account secure</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security</div>
              </div>
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={(e) => setSettings({ ...settings, twoFactorAuth: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (minutes)</label>
              <select
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-pink-50 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
              <Palette className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customize how the app looks</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Compact Mode</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing for more content</div>
              </div>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Database Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Database className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Database</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Backup and data management</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Automatic Backups</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Automatically backup your data</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
            {settings.autoBackup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Settings saved successfully!</span>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-black to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Save className="h-5 w-5 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
