import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle, XCircle, Clock, Mail, Upload, Settings, Bell, UserPlus, UserMinus, X } from 'lucide-react';
import DataExporter from './CSVUploader';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  approved: boolean;
  created_at: string;
  role: 'admin' | 'manager' | 'teknisi';
  permissions: string[];
}

const AdminPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'csv' | 'access' | 'reminders' | 'accounts'>('users');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ username: '', password: '', name: '', role: 'teknisi' as 'teknisi' | 'manager' | 'helper' });
  const [systemAccounts, setSystemAccounts] = useState<any[]>([]);
  const [technicianCodes, setTechnicianCodes] = useState<any[]>([]);
  const [showTechCodeModal, setShowTechCodeModal] = useState(false);
  const [editingTechCode, setEditingTechCode] = useState<any>(null);
  
  // Track pending changes
  const [originalSystemAccounts, setOriginalSystemAccounts] = useState<any[]>([]);
  const [originalTechCodes, setOriginalTechCodes] = useState<any[]>([]);
  const [pendingAccountChanges, setPendingAccountChanges] = useState<{
    added: any[];
    updated: any[];
    deleted: string[];
  }>({ added: [], updated: [], deleted: [] });
  const [pendingTechCodeChanges, setPendingTechCodeChanges] = useState<{
    updated: any[];
  }>({ updated: [] });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchUsers();
    loadSystemAccounts();
    loadTechnicianCodes();
  }, []);

  const loadSystemAccounts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_accounts')
        .select('*')
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSystemAccounts(data);
        setOriginalSystemAccounts(JSON.parse(JSON.stringify(data))); // Deep copy
        // Sync to localStorage for backward compatibility
        localStorage.setItem('systemAccounts', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error loading system accounts:', error);
      // Fallback to localStorage if database fails
      const accounts = JSON.parse(localStorage.getItem('systemAccounts') || '[]');
      setSystemAccounts(accounts);
    }
  };

  const loadTechnicianCodes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('technician_codes')
        .select(`
          *,
          system_accounts(username, name, role)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setTechnicianCodes(data);
        setOriginalTechCodes(JSON.parse(JSON.stringify(data))); // Deep copy
      }
    } catch (error) {
      console.error('Error loading technician codes:', error);
    }
  };

  const toggleAccountStatus = (accountId: string) => {
    const updatedAccounts = systemAccounts.map(acc => 
      acc.id === accountId ? { ...acc, active: !acc.active } : acc
    );
    setSystemAccounts(updatedAccounts);
    
    // Track as pending update
    const account = updatedAccounts.find(a => a.id === accountId);
    const existingUpdateIndex = pendingAccountChanges.updated.findIndex(a => a.id === accountId);
    
    if (existingUpdateIndex >= 0) {
      const newUpdated = [...pendingAccountChanges.updated];
      newUpdated[existingUpdateIndex] = account;
      setPendingAccountChanges({ ...pendingAccountChanges, updated: newUpdated });
    } else {
      setPendingAccountChanges({
        ...pendingAccountChanges,
        updated: [...pendingAccountChanges.updated, account]
      });
    }
    
    setHasUnsavedChanges(true);
    setMessage(`Perubahan status akun ditandai. Klik SIMPAN untuk menyimpan.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const addNewAccount = () => {
    if (!newAccount.username || !newAccount.password || !newAccount.name) {
      setMessage('Semua field harus diisi!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Check duplicate in current accounts
    const accountExists = systemAccounts.some(acc => acc.username === newAccount.username);
    if (accountExists) {
      setMessage('Username sudah digunakan!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const newAccountData = {
      id: `temp_${Date.now()}`, // Temporary ID
      username: newAccount.username,
      password: newAccount.password,
      name: newAccount.name,
      role: newAccount.role,
      active: true,
      is_default: false,
      _isNew: true // Flag to identify new accounts
    };

    setSystemAccounts([...systemAccounts, newAccountData]);
    setPendingAccountChanges({
      ...pendingAccountChanges,
      added: [...pendingAccountChanges.added, newAccountData]
    });
    
    setHasUnsavedChanges(true);
    setShowAddAccountModal(false);
    setNewAccount({ username: '', password: '', name: '', role: 'teknisi' });
    setMessage(`Akun ${newAccountData.username} ditambahkan. Klik SIMPAN untuk menyimpan ke database.`);
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteAccount = (accountId: string) => {
    if (!window.confirm('Tandai akun ini untuk dihapus?')) return;

    const account = systemAccounts.find(a => a.id === accountId);
    
    // If it's a new account (not yet saved), just remove it
    if (account?._isNew) {
      setSystemAccounts(systemAccounts.filter(a => a.id !== accountId));
      setPendingAccountChanges({
        ...pendingAccountChanges,
        added: pendingAccountChanges.added.filter(a => a.id !== accountId)
      });
    } else {
      // Mark for deletion
      setSystemAccounts(systemAccounts.filter(a => a.id !== accountId));
      setPendingAccountChanges({
        ...pendingAccountChanges,
        deleted: [...pendingAccountChanges.deleted, accountId]
      });
    }
    
    setHasUnsavedChanges(true);
    setMessage('Akun ditandai untuk dihapus. Klik SIMPAN untuk menghapus dari database.');
    setTimeout(() => setMessage(''), 3000);
  };

  const updateTechnicianCode = (techCode: any) => {
    const updatedCodes = technicianCodes.map(tc => 
      tc.id === techCode.id ? techCode : tc
    );
    setTechnicianCodes(updatedCodes);
    
    // Track as pending update
    const existingUpdateIndex = pendingTechCodeChanges.updated.findIndex(tc => tc.id === techCode.id);
    
    if (existingUpdateIndex >= 0) {
      const newUpdated = [...pendingTechCodeChanges.updated];
      newUpdated[existingUpdateIndex] = techCode;
      setPendingTechCodeChanges({ updated: newUpdated });
    } else {
      setPendingTechCodeChanges({
        updated: [...pendingTechCodeChanges.updated, techCode]
      });
    }
    
    setHasUnsavedChanges(true);
    setShowTechCodeModal(false);
    setEditingTechCode(null);
    setMessage('Perubahan kode teknisi ditandai. Klik SIMPAN untuk menyimpan.');
    setTimeout(() => setMessage(''), 3000);
  };

  // Save all pending changes to database
  const saveAllChanges = async () => {
    setLoading(true);
    setMessage('Menyimpan perubahan...');
    
    try {
      // 1. Add new accounts
      if (pendingAccountChanges.added.length > 0) {
        const accountsToAdd = pendingAccountChanges.added.map(acc => ({
          username: acc.username,
          password: acc.password,
          name: acc.name,
          role: acc.role,
          active: acc.active,
          is_default: acc.is_default
        }));
        
        const { error } = await (supabase as any)
          .from('system_accounts')
          .insert(accountsToAdd);
        
        if (error) throw error;
      }

      // 2. Update accounts
      if (pendingAccountChanges.updated.length > 0) {
        for (const account of pendingAccountChanges.updated) {
          const { error } = await (supabase as any)
            .from('system_accounts')
            .update({
              active: account.active,
              name: account.name,
              password: account.password
            })
            .eq('id', account.id);
          
          if (error) throw error;
        }
      }

      // 3. Delete accounts
      if (pendingAccountChanges.deleted.length > 0) {
        const { error } = await (supabase as any)
          .from('system_accounts')
          .delete()
          .in('id', pendingAccountChanges.deleted);
        
        if (error) throw error;
      }

      // 4. Update technician codes
      if (pendingTechCodeChanges.updated.length > 0) {
        for (const techCode of pendingTechCodeChanges.updated) {
          const { error } = await (supabase as any)
            .from('technician_codes')
            .update({
              name: techCode.name,
              account_id: techCode.account_id,
              active: techCode.active
            })
            .eq('id', techCode.id);
          
          if (error) throw error;
        }
      }

      // Reload data from database
      await loadSystemAccounts();
      await loadTechnicianCodes();

      // Clear pending changes
      setPendingAccountChanges({ added: [], updated: [], deleted: [] });
      setPendingTechCodeChanges({ updated: [] });
      setHasUnsavedChanges(false);

      setMessage('✅ Semua perubahan berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving changes:', error);
      setMessage(`❌ Gagal menyimpan: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Discard all pending changes
  const discardChanges = () => {
    if (!window.confirm('Batalkan semua perubahan yang belum disimpan?')) return;
    
    setSystemAccounts(JSON.parse(JSON.stringify(originalSystemAccounts)));
    setTechnicianCodes(JSON.parse(JSON.stringify(originalTechCodes)));
    setPendingAccountChanges({ added: [], updated: [], deleted: [] });
    setPendingTechCodeChanges({ updated: [] });
    setHasUnsavedChanges(false);
    setMessage('Perubahan dibatalkan');
    setTimeout(() => setMessage(''), 3000);
  };

  // Warning before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchUsers = async () => {
    try {
      // Get approval status from localStorage to persist approvals
      const approvalStatus = JSON.parse(localStorage.getItem('userApprovals') || '{}');
      
      // Get user roles and permissions from localStorage
      const userRoles = JSON.parse(localStorage.getItem('userRoles') || '{}');
      const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
      
      // Use simple hardcoded users for now since we don't have user_profiles table
      const hardcodedUsers = [
        { 
          id: '1', 
          email: 'admin@afc.com', 
          full_name: 'Admin AFC', 
          approved: true, 
          created_at: new Date().toISOString(),
          role: userRoles['1'] || 'admin',
          permissions: userPermissions['1'] || ['dashboard', 'calendar', 'work_reports', 'order_history', 'admin_panel', 'user_management']
        },
        { 
          id: '2', 
          email: 'manager@afc.com', 
          full_name: 'Manager AFC', 
          approved: true, 
          created_at: new Date().toISOString(),
          role: userRoles['2'] || 'manager',
          permissions: userPermissions['2'] || ['dashboard', 'calendar', 'work_reports', 'order_history', 'edit_bookings']
        },
        { 
          id: '3', 
          email: 'teknisi1@afc.com', 
          full_name: 'Taufiq', 
          approved: true, 
          created_at: new Date().toISOString(),
          role: userRoles['3'] || 'teknisi',
          permissions: userPermissions['3'] || ['dashboard', 'calendar', 'work_reports']
        },
        { 
          id: '4', 
          email: 'teknisi2@afc.com', 
          full_name: 'Teknisi 2', 
          approved: true, 
          created_at: new Date().toISOString(),
          role: userRoles['4'] || 'teknisi',
          permissions: userPermissions['4'] || ['dashboard', 'calendar', 'work_reports']
        },
        { 
          id: '5', 
          email: 'teknisi3@afc.com', 
          full_name: 'Teknisi 3', 
          approved: approvalStatus['5'] || false, 
          created_at: new Date().toISOString(),
          role: userRoles['5'] || 'teknisi',
          permissions: userPermissions['5'] || ['dashboard', 'calendar', 'work_reports']
        },
        { 
          id: '6', 
          email: 'iwan@afc.com', 
          full_name: 'Iwan', 
          approved: approvalStatus['6'] || true, 
          created_at: new Date().toISOString(),
          role: userRoles['6'] || 'teknisi',
          permissions: userPermissions['6'] || ['dashboard', 'calendar', 'work_reports']
        },
        { 
          id: '7', 
          email: 'dedy@afc.com', 
          full_name: 'Dedy', 
          approved: approvalStatus['7'] || true, 
          created_at: new Date().toISOString(),
          role: userRoles['7'] || 'teknisi',
          permissions: userPermissions['7'] || ['dashboard', 'calendar', 'work_reports']
        },
      ];
      setUsers(hardcodedUsers);
    } catch (error: unknown) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, userEmail: string) => {
    try {
      // Save approval status to localStorage for persistence
      const approvalStatus = JSON.parse(localStorage.getItem('userApprovals') || '{}');
      approvalStatus[userId] = true;
      localStorage.setItem('userApprovals', JSON.stringify(approvalStatus));
      
      // Update local state for demo
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, approved: true } : user
      ));
      setMessage(`User ${userEmail} berhasil disetujui!`);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error: unknown) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
    }
  };

  const rejectUser = async (userId: string, userEmail: string) => {
    try {
      // Save rejection status to localStorage for persistence
      const approvalStatus = JSON.parse(localStorage.getItem('userApprovals') || '{}');
      approvalStatus[userId] = false;
      localStorage.setItem('userApprovals', JSON.stringify(approvalStatus));
      
      setMessage(`User ${userEmail} telah ditolak`);
      fetchUsers();
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error: unknown) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`);
    }
  };

  const updateUserRole = (userId: string, newRole: 'admin' | 'manager' | 'teknisi') => {
    const userRoles = JSON.parse(localStorage.getItem('userRoles') || '{}');
    userRoles[userId] = newRole;
    localStorage.setItem('userRoles', JSON.stringify(userRoles));
    
    // Update default permissions based on role
    const defaultPermissions = {
      admin: ['dashboard', 'calendar', 'work_reports', 'order_history', 'admin_panel', 'user_management'],
      manager: ['dashboard', 'calendar', 'work_reports', 'order_history', 'edit_bookings'],
      teknisi: ['dashboard', 'calendar', 'work_reports']
    };
    
    const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    userPermissions[userId] = defaultPermissions[newRole];
    localStorage.setItem('userPermissions', JSON.stringify(userPermissions));
    
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, role: newRole, permissions: defaultPermissions[newRole] } : user
    ));
    
    setMessage(`Role user berhasil diubah ke ${newRole}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const updateUserPermissions = (userId: string, permissions: string[]) => {
    const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '{}');
    userPermissions[userId] = permissions;
    localStorage.setItem('userPermissions', JSON.stringify(userPermissions));
    
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, permissions } : user
    ));
    
    setMessage('Permissions berhasil diupdate');
    setTimeout(() => setMessage(''), 3000);
  };

  const openAccessModal = (user: UserProfile) => {
    setSelectedUser(user);
    setShowAccessModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const pendingUsers = users.filter(user => !user.approved);
  const approvedUsers = users.filter(user => user.approved);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Lilita One, cursive' }}>
          Admin Panel
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Kelola persetujuan user AFC System</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('users');
            setMessage(''); // Clear any messages when switching tabs
          }}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Kelola </span>User
        </Button>
        <Button
          variant={activeTab === 'access' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('access');
            setMessage('');
          }}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Akses &</span> Role
        </Button>
        <Button
          variant={activeTab === 'accounts' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('accounts');
            setMessage('');
          }}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Kelola</span> Akun
        </Button>
        <Button
          variant={activeTab === 'reminders' ? 'default' : 'outline'}
          onClick={() => {
            setActiveTab('reminders');
            setMessage('');
          }}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">H-1 </span>Reminders
        </Button>
        <Button
          variant={activeTab === 'csv' ? 'default' : 'outline'}
          onClick={() => setActiveTab('csv')}
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
        >
          <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
          Export
        </Button>
      </div>

      {message && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {activeTab === 'csv' ? (
        <DataExporter />
      ) : activeTab === 'reminders' ? (
        <div className="p-4 text-center text-gray-500">
          Reminder monitoring feature coming soon
        </div>
      ) : activeTab === 'accounts' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Kelola Akun Sistem
                </CardTitle>
                <Button
                  onClick={() => setShowAddAccountModal(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Tambah Akun
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['teknisi', 'manager', 'helper'].map(role => {
                  const roleAccounts = systemAccounts.filter(acc => acc.role === role);
                  return (
                    <div key={role} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-3 capitalize">
                        {role === 'teknisi' ? 'Teknisi' : role === 'manager' ? 'Manager' : 'Helper'} ({roleAccounts.length})
                      </h3>
                      <div className="space-y-2">
                        {roleAccounts.map(account => (
                          <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{account.name}</h4>
                                <Badge className={account.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                  {account.active ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                                {account.isDefault && (
                                  <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">Username: {account.username}</p>
                              <p className="text-sm text-gray-500">Password: {account.password}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={account.active ? 'destructive' : 'default'}
                                onClick={() => toggleAccountStatus(account.id)}
                                className="text-xs"
                              >
                                {account.active ? (
                                  <><UserMinus className="h-3 w-3 mr-1" />Nonaktifkan</>
                                ) : (
                                  <><UserPlus className="h-3 w-3 mr-1" />Aktifkan</>
                                )}
                              </Button>
                              {!account.isDefault && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteAccount(account.id)}
                                  className="text-xs text-red-600 hover:bg-red-50"
                                >
                                  Hapus
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Technician Codes Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                Kelola Kode Teknisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {technicianCodes.map(techCode => (
                  <div key={techCode.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-purple-100 text-purple-800 font-bold text-base px-3 py-1">
                          {techCode.code}
                        </Badge>
                        <Badge className={techCode.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {techCode.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-base font-medium">
                        {techCode.name || <span className="text-gray-400 italic">Kosong</span>}
                      </p>
                      {techCode.system_accounts && (
                        <p className="text-sm text-gray-600">
                          Linked: {techCode.system_accounts.name} (@{techCode.system_accounts.username})
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTechCode(techCode);
                        setShowTechCodeModal(true);
                      }}
                      className="text-xs"
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Save/Discard Buttons - Fixed at bottom when there are unsaved changes */}
          {hasUnsavedChanges && (
            <div className="sticky bottom-0 bg-white border-t-2 border-orange-500 shadow-lg p-4 rounded-lg">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-orange-700">
                    Ada {pendingAccountChanges.added.length + pendingAccountChanges.updated.length + pendingAccountChanges.deleted.length + pendingTechCodeChanges.updated.length} perubahan yang belum disimpan
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={discardChanges}
                    className="border-gray-300 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Batalkan
                  </Button>
                  <Button
                    onClick={saveAllChanges}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Simpan Semua Perubahan
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'access' ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Manajemen Akses & Role User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.filter(user => user.approved).map((user) => (
                  <div key={user.id} className="p-3 sm:p-4 border rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg">{user.full_name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 break-all">{user.email}</p>
                      </div>
                      <Badge 
                        className={`text-xs self-start ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">Role:</label>
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                          className="w-full sm:w-auto px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="teknisi">Teknisi</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {user.permissions.length} permissions
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAccessModal(user)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2"
                        >
                          Edit Akses
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
                <p className="text-sm text-gray-600">Menunggu Persetujuan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{approvedUsers.length}</p>
                <p className="text-sm text-gray-600">User Disetujui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                <p className="text-sm text-gray-600">Total User</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            User Menunggu Persetujuan ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Tidak ada user yang menunggu persetujuan</p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">{user.full_name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 break-all">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Mendaftar: {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => approveUser(user.id, user.email)}
                      className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectUser(user.id, user.email)}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      Tolak
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            User Disetujui ({approvedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Belum ada user yang disetujui</p>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-green-50 gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm sm:text-base">{user.full_name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 break-all">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Disetujui: {new Date(user.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Aktif
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Reset approval status - Fix for Teknisi 3 bug
                        const approvalStatus = JSON.parse(localStorage.getItem('userApprovals') || '{}');
                        approvalStatus[user.id] = false; // Set to false instead of delete
                        localStorage.setItem('userApprovals', JSON.stringify(approvalStatus));
                        
                        // Update state
                        setUsers(prev => prev.map(u => 
                          u.id === user.id ? { ...u, approved: false } : u
                        ));
                        setMessage(`User ${user.email} dikembalikan ke status pending`);
                        setTimeout(() => setMessage(''), 3000);
                      }}
                      className="text-xs px-2 py-1"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      )}
      
      {/* Access Modal */}
      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-4">
              Edit Akses - {selectedUser.full_name}
            </h3>
            <div className="space-y-3">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'calendar', label: 'Kalender' },
                { key: 'work_reports', label: 'Laporan Kerja' },
                { key: 'order_history', label: 'Riwayat Order' },
                { key: 'edit_bookings', label: 'Edit Booking' },
                { key: 'admin_panel', label: 'Admin Panel' },
                { key: 'user_management', label: 'Kelola User' }
              ].map((permission) => (
                <label key={permission.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedUser.permissions.includes(permission.key)}
                    onChange={(e) => {
                      const newPermissions = e.target.checked
                        ? [...selectedUser.permissions, permission.key]
                        : selectedUser.permissions.filter(p => p !== permission.key);
                      setSelectedUser({ ...selectedUser, permissions: newPermissions });
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{permission.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => {
                  updateUserPermissions(selectedUser.id, selectedUser.permissions);
                  setShowAccessModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1"
              >
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccessModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Tambah Akun Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newAccount.role}
                  onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="teknisi">Teknisi</option>
                  <option value="manager">Manager</option>
                  <option value="helper">Helper</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Contoh: John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Contoh: teknisi4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="text"
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Contoh: afc123"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={addNewAccount} className="flex-1 bg-green-600 hover:bg-green-700">
                Tambah
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddAccountModal(false);
                  setNewAccount({ username: '', password: '', name: '', role: 'teknisi' });
                }}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Technician Code Modal */}
      {showTechCodeModal && editingTechCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Kode Teknisi - {editingTechCode.code}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Teknisi</label>
                <input
                  type="text"
                  value={editingTechCode.name}
                  onChange={(e) => setEditingTechCode({ ...editingTechCode, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Contoh: Taufiq"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Link ke Akun Teknisi (Optional)</label>
                <select
                  value={editingTechCode.account_id || ''}
                  onChange={(e) => setEditingTechCode({ ...editingTechCode, account_id: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Tidak di-link</option>
                  {systemAccounts.filter(acc => acc.role === 'teknisi' && acc.active).map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (@{acc.username})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Link ke akun teknisi untuk login access</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTechCode.active}
                  onChange={(e) => setEditingTechCode({ ...editingTechCode, active: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm">Aktif</label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => updateTechnicianCode(editingTechCode)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTechCodeModal(false);
                  setEditingTechCode(null);
                }}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
