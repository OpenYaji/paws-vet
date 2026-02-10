'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Mail, Phone, MapPin, Users, Shield, Stethoscope, User, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  address?: string;
  account_status?: string;
  email_verified?: boolean;
  last_login_at?: string;
  created_at: string;
}

const USERS_PER_PAGE = 10;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    petOwners: 0,
    veterinarians: 0,
    admins: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, roleFilter, users]);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      
      const usersData = await response.json();
      setUsers(usersData);

      const total = usersData.length;
      const petOwners = usersData.filter((u: User) => u.role === 'client').length;
      const veterinarians = usersData.filter((u: User) => u.role === 'veterinarian').length;
      const admins = usersData.filter((u: User) => u.role === 'admin').length;

      setStats({ total, petOwners, veterinarians, admins });
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function filterUsers() {
    let filtered = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(query) ||
        user.full_name?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'veterinarian':
        return 'default';
      case 'client':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  function formatRole(role: string) {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function handleViewUser(user: User) {
    const roleRouteMap = {
      client: 'client',
      veterinarian: 'vet',
      admin: 'admin'
    };
    const route = roleRouteMap[user.role as keyof typeof roleRouteMap] || 'client';
    router.push(`/admin/users-management/${route}/${user.id}`);
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const endIndex = startIndex + USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  function goToNextPage() {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }

  function goToPreviousPage() {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-10 w-64 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-5 w-96 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="h-11 w-40 bg-gray-200 animate-pulse rounded"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-9 w-16 bg-gray-200 animate-pulse rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card className="border-2">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
            </div>
            <div className="flex gap-4 mt-4">
              <div className="h-11 flex-1 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-11 w-48 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <TableHead key={i}>
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                            <div className="h-3 w-40 bg-gray-200 animate-pulse rounded"></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 w-20 bg-gray-200 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadUsers}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground mt-2 text-base">Manage and monitor all system users</p>
        </div>
        <Button size="lg" className="gap-2 shadow-sm">
          <UserPlus size={20} />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered users</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 hover:border-blue-500/50 transition-colors">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pet Owners</CardTitle>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.petOwners}</div>
            <p className="text-xs text-muted-foreground mt-1">Client accounts</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 hover:border-green-500/50 transition-colors">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Veterinarians</CardTitle>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.veterinarians}</div>
            <p className="text-xs text-muted-foreground mt-1">Medical professionals</p>
          </CardContent>
        </Card>
        
        <Card className="border-2 hover:border-red-500/50 transition-colors">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground mt-1">System administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table with Integrated Filters */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Users Directory</CardTitle>
            <Badge variant="outline" className="text-base px-3 py-1">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>
          
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-2"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 border-2">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="client">Pet Owners</SelectItem>
                <SelectItem value="veterinarian">Veterinarians</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Status</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Joined</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">No users found</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewUser(user)}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                            <span className="text-base font-bold text-primary">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-base">{user.full_name || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Mail size={14} />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getRoleBadgeVariant(user.role)}
                          className="font-medium px-3 py-1"
                        >
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1.5 text-sm">
                          {user.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone size={14} />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user.address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin size={14} />
                              <span className="truncate max-w-[200px]">{user.address.substring(0, 30)}...</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge 
                          variant={user.account_status === 'active' ? 'default' : 'secondary'}
                          className="font-medium"
                        >
                          {user.account_status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm font-medium">{formatDate(user.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => handleViewUser(user)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {filteredUsers.length > USERS_PER_PAGE && (
            <div className="border-t px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm font-medium px-3">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
