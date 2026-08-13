import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Lock } from 'lucide-react';

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();
    const { pushToast, askConfirm } = useUIStore();
    
    // Tab state
    const [activeTab, setActiveTab] = useState('usuarios');

    // Modals state
    const [modalUserOpen, setModalUserOpen] = useState(false);
    const [modalRolOpen, setModalRolOpen] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [editingRol, setEditingRol] = useState(null);

    // Form state (Usuarios)
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Form state (Roles)
    const [rolNombre, setRolNombre] = useState('');
    const [selectedPermisos, setSelectedPermisos] = useState([]);
    const [assignmentMode, setAssignmentMode] = useState('permisos'); // 'secciones' | 'permisos'
    const [selectedSections, setSelectedSections] = useState([]);
    const { unidadNegocioActiva } = useAuthStore();
    const isHerramientas = parseInt(unidadNegocioActiva) === 2;

    const SECTIONS = [
        { id: 'ventas', name: 'Ventas', permNames: ['ESCRIBIR_VENTAS', 'LEER_CLIENTES', 'LEER_STOCK'] },
        { id: 'productos', name: isHerramientas ? 'Productos' : 'Productos (Plantas)', permNames: ['LEER_STOCK', 'ESCRIBIR_STOCK'] },
        ...(!isHerramientas ? [{ id: 'siembras', name: 'Siembras', permNames: ['LEER_STOCK'] }] : []),
        ...(!isHerramientas ? [{ id: 'insumos', name: 'Insumos', permNames: ['LEER_INSUMOS', 'ESCRIBIR_INSUMOS'] }] : []),
        { id: 'clientes', name: 'Clientes', permNames: ['LEER_CLIENTES', 'ESCRIBIR_CLIENTES'] },
        ...(isHerramientas ? [{ id: 'finanzas', name: 'Finanzas', permNames: ['LEER_FINANZAS'] }] : []),
        ...(isHerramientas ? [{ id: 'cheques', name: 'Cheques', permNames: ['LEER_FINANZAS'] }] : []),
        { id: 'admin', name: 'Usuarios (Admin)', permNames: ['ADMIN_DB'] }
    ];

    useEffect(() => {
        if (!token) return;
        fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usRes, rolRes, perRes] = await Promise.all([
                api.get('/usuarios'),
                api.get('/roles'),
                api.get('/roles/permisos')
            ]);
            setUsuarios(usRes?.data || []);
            setRoles(rolRes?.data || []);
            setPermisos(perRes?.data || []);
        } catch (error) {
            console.error('Error fetching data', error);
            pushToast('error', 'Error al cargar datos. Verifique sus permisos.');
        } finally {
            setLoading(false);
        }
    };

    // ================= USUARIOS =================
    const openUserModal = (usuario = null) => {
        setEditingUsuario(usuario);
        if (usuario) {
            setUsername(usuario.username);
            setPassword('');
            setSelectedRoles(usuario.roles ? usuario.roles.map(r => r.id) : []);
        } else {
            setUsername('');
            setPassword('');
            setSelectedRoles([]);
        }
        setModalUserOpen(true);
    };

    const handleRoleToggle = (rolId) => {
        setSelectedRoles(prev => 
            prev.includes(rolId) ? prev.filter(id => id !== rolId) : [...prev, rolId]
        );
    };

    const handleUserSave = async (e) => {
        e.preventDefault();
        const payload = { username, password: password || undefined, roleIds: selectedRoles };
        try {
            if (editingUsuario) await api.put(`/usuarios/${editingUsuario.id}`, payload);
            else await api.post('/usuarios', payload);
            setModalUserOpen(false);
            fetchData();
            pushToast('success', 'Usuario guardado correctamente.');
        } catch (error) {
            console.error(error);
            pushToast('error', getErrorMessage(error, 'Error al guardar usuario'));
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            await api.delete(`/usuarios/${id}`);
            fetchData();
            pushToast('success', 'Usuario eliminado.');
        } catch (error) {
            console.error(error);
            pushToast('error', 'Error al eliminar');
        }
    };

    // ================= ROLES =================
    const openRolModal = (rol = null) => {
        setEditingRol(rol);
        if (rol) {
            setRolNombre(rol.nombre);
            setSelectedPermisos(rol.permisos.map(p => p.id));
            setAssignmentMode('permisos'); // By default when editing, unless we want to try to infer sections
            setSelectedSections([]);
        } else {
            setRolNombre('');
            setSelectedPermisos([]);
            setAssignmentMode('secciones');
            setSelectedSections([]);
        }
        setModalRolOpen(true);
    };

    const handlePermisoToggle = (permisoId) => {
        setSelectedPermisos(prev => 
            prev.includes(permisoId) ? prev.filter(id => id !== permisoId) : [...prev, permisoId]
        );
    };

    const handleSectionToggle = (sectionId) => {
        setSelectedSections(prev => 
            prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
        );
    };

    const handleRolSave = async (e) => {
        e.preventDefault();
        
        let finalPermisoIds = [];
        if (assignmentMode === 'permisos') {
            finalPermisoIds = selectedPermisos;
        } else {
            // Find IDs for all permissions in the selected sections
            const neededNames = SECTIONS.filter(s => selectedSections.includes(s.id))
                                        .flatMap(s => s.permNames);
            finalPermisoIds = permisos.filter(p => neededNames.includes(p.nombre))
                                      .map(p => p.id);
        }

        const payload = { nombre: rolNombre, permisoIds: finalPermisoIds };
        try {
            if (editingRol) await api.put(`/roles/${editingRol.id}`, payload);
            else await api.post('/roles', payload);
            setModalRolOpen(false);
            fetchData();
            pushToast('success', 'Rol guardado correctamente.');
        } catch (error) {
            console.error(error);
            pushToast('error', getErrorMessage(error, 'Error al guardar rol'));
        }
    };

    const handleDeleteRol = async (id) => {
        try {
            await api.delete(`/roles/${id}`);
            fetchData();
            pushToast('success', 'Rol eliminado.');
        } catch (error) {
            console.error(error);
            pushToast('error', 'Error al eliminar rol');
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Cargando...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Administración</h1>
                <button 
                    onClick={activeTab === 'usuarios' ? () => openUserModal() : () => openRolModal()}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + Nuevo {activeTab === 'usuarios' ? 'Usuario' : 'Rol'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'usuarios' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'roles' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Roles y Permisos
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {activeTab === 'usuarios' && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b">ID</th>
                                <th className="p-4 font-semibold border-b">Usuario</th>
                                <th className="p-4 font-semibold border-b">Accesos</th>
                                <th className="p-4 font-semibold border-b text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {usuarios.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-gray-500">#{u.id}</td>
                                    <td className="p-4 font-medium text-gray-800">{u.username}</td>
                                    <td className="p-4">
                                        {!u.roles || u.roles.length === 0 ? (
                                            <span className="text-gray-400 italic text-sm">Sin roles asignados</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {u.roles.map((r, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
                                                        {r.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {u.username === 'jefe@vivero.com' || u.username === 'admin2' ? (
                                            <span className="text-gray-400 italic text-sm" title="Este usuario está protegido y no se puede editar ni eliminar">
                                                Usuario protegido
                                            </span>
                                        ) : (
                                            <>
                                                <button onClick={() => openUserModal(u)} className="text-blue-600 hover:text-blue-800 font-medium mr-4">Editar</button>
                                                <button
                                                    onClick={() => askConfirm({
                                                        title: 'Eliminar Usuario',
                                                        message: '¿Seguro que desea eliminar este usuario?',
                                                        variant: 'danger',
                                                        confirmLabel: 'Eliminar',
                                                        onConfirm: () => handleDeleteUser(u.id),
                                                    })}
                                                    className="text-red-600 hover:text-red-800 font-medium cursor-pointer">Eliminar</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {activeTab === 'roles' && (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold border-b">ID</th>
                                <th className="p-4 font-semibold border-b">Nombre del Rol</th>
                                <th className="p-4 font-semibold border-b">Permisos Asignados</th>
                                <th className="p-4 font-semibold border-b text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {roles.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-gray-500">#{r.id}</td>
                                    <td className="p-4 font-medium text-gray-800 flex items-center space-x-2">
                                        <span>{r.nombre}</span>
                                        {r.enUso && (
                                            <span className="flex items-center text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200" title="Este rol está asignado a uno o más usuarios">
                                                <Lock size={12} className="mr-1" />
                                                En uso
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(r.permisos || []).map(p => (
                                                <span key={p.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded border border-gray-200">
                                                    {p.nombre}
                                                </span>
                                            ))}
                                            {(!r.permisos || r.permisos.length === 0) && <span className="text-gray-400 italic text-sm">Sin permisos</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openRolModal(r)} className="text-blue-600 hover:text-blue-800 font-medium mr-4">Editar</button>
                                        <button 
                                            onClick={() => askConfirm({
                                                title: 'Eliminar Rol',
                                                message: '¿Seguro que desea eliminar este rol? Se desasignará de los usuarios.',
                                                variant: 'danger',
                                                confirmLabel: 'Eliminar',
                                                onConfirm: () => handleDeleteRol(r.id),
                                            })} 
                                            disabled={r.enUso}
                                            className={`font-medium cursor-pointer ${r.enUso ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                                            title={r.enUso ? 'No se puede eliminar un rol en uso' : 'Eliminar rol'}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Usuario */}
            {modalUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setModalUserOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="usuario-form" onSubmit={handleUserSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username (Email)</label>
                                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {editingUsuario && <span className="text-gray-400 font-normal">(Dejar en blanco para no cambiar)</span>}</label>
                                    <input type="password" required={!editingUsuario} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Roles Asignados</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {roles.map(r => (
                                            <label key={r.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedRoles.includes(r.id)}
                                                    onChange={() => handleRoleToggle(r.id)}
                                                    className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{r.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setModalUserOpen(false)} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" form="usuario-form" className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rol */}
            {modalRolOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">{editingRol ? 'Editar Rol' : 'Nuevo Rol'}</h2>
                            <button onClick={() => setModalRolOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="rol-form" onSubmit={handleRolSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Rol</label>
                                    <input type="text" required value={rolNombre} onChange={(e) => setRolNombre(e.target.value.toUpperCase())} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" />
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-gray-700">Asignación de Accesos</h3>
                                        <div className="flex bg-gray-100 rounded-lg p-1">
                                            <button 
                                                type="button"
                                                onClick={() => setAssignmentMode('secciones')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${assignmentMode === 'secciones' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Por Secciones
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setAssignmentMode('permisos')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${assignmentMode === 'permisos' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                Avanzado (Permisos)
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {assignmentMode === 'secciones' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {SECTIONS.map(s => (
                                                <label key={s.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedSections.includes(s.id)}
                                                        onChange={() => handleSectionToggle(s.id)}
                                                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {permisos.map(p => (
                                                <label key={p.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedPermisos.includes(p.id)}
                                                        onChange={() => handlePermisoToggle(p.id)}
                                                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{p.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={() => setModalRolOpen(false)} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" form="rol-form" className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
