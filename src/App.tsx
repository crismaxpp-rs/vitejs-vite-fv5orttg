import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BookOpen, FileText, CheckCircle, Clock, LogOut, Plus, 
  UserPlus, GraduationCap, ChevronRight, Printer, Search, LayoutDashboard, 
  Settings, Trash2, AlertCircle, TrendingUp, Calendar, ClipboardList, 
  Archive, Building, Landmark, BarChart, PieChart, ArrowRight, Check, 
  Lock, X, Video, MapPin, Database
} from 'lucide-react';

// --- CONFIGURAÇÃO REAL DO FIREBASE (JÁ COM SUAS CHAVES) ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDxVE4GiCxfVINVEKZZYKv4tDNqNWMfxKw",
  authDomain: "mentorflow-5f4dd.firebaseapp.com",
  projectId: "mentorflow-5f4dd",
  storageBucket: "mentorflow-5f4dd.firebasestorage.app",
  messagingSenderId: "881130883836",
  appId: "1:881130883836:web:317169b1f09b96cb6fa579",
  measurementId: "G-DWJDQ6Y1QE"
};

// Inicialização do Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONSTANTES DE DADOS (FALLBACK) ---
const INITIAL_COURSES = [
  "Ciência da Computação", "Engenharia Civil", "Direito", 
  "Administração", "Medicina", "Sistemas de Informação",
  "Direito Constitucional", "Direito Civil"
];

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estados de Dados (Vêm do Banco de Dados)
  const [users, setUsers] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [logs, setLogs] = useState([]);
  const [courses, setCourses] = useState(INITIAL_COURSES);
  
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    // 1. Escutar Usuários
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      // Ordenar por nome para facilitar
      setUsers(data.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => console.error("Erro ao buscar usuários:", error));

    // 2. Escutar Vínculos
    const unsubRels = onSnapshot(collection(db, "relationships"), (snapshot) => {
      setRelationships(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    // 3. Escutar Logs (Orientações)
    const qLogs = query(collection(db, "logs"), orderBy("date", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setIsLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRels();
      unsubLogs();
    };
  }, []);

  // --- ACTIONS (GRAVAÇÃO NO BANCO) ---
  
  // Adicionar Usuário
  const handleAddUserDB = async (userData) => {
    try {
      await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: new Date().toISOString()
      });
      alert("Usuário salvo no banco de dados!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  // Adicionar Log/Orientação
  const handleAddLogDB = async (logData) => {
    try {
      await addDoc(collection(db, "logs"), {
        ...logData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      alert("Erro ao salvar registro: " + e.message);
    }
  };

  // Atualizar Log (Aprovação/Feedback)
  const handleUpdateLogDB = async (logId, updates) => {
    try {
      const logRef = doc(db, "logs", logId);
      await updateDoc(logRef, updates);
    } catch (e) {
      alert("Erro ao atualizar: " + e.message);
    }
  };

  // Criar Vínculos (Alocação)
  const handleAllocationDB = async (studentIds, professorId) => {
    const batchPromises = studentIds.map(studentId => {
      return addDoc(collection(db, "relationships"), {
        studentId,
        professorId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    });
    
    await Promise.all(batchPromises);
    alert("Vínculos salvos com sucesso!");
  };

  // Remover Vínculo (Update status ou Delete)
  const handleRemoveLinkDB = async (relId, type = 'delete') => {
    if (type === 'delete') {
      await deleteDoc(doc(db, "relationships", relId));
    } else {
      await updateDoc(doc(db, "relationships", relId), { status: 'completed' });
    }
  };

  // --- HELPERS ---
  const getMyAdvisor = (studentId) => {
    const rel = relationships.find(r => r.studentId === studentId && r.status === 'active') || relationships.find(r => r.studentId === studentId);
    return rel ? users.find(u => u.id === rel.professorId) : null;
  };

  // --- RENDERERS ---

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-blue-600 font-bold animate-pulse">Carregando dados do Firebase...</div>;
  }

  if (!currentUser) {
    return (
      <LandingPage 
        users={users} 
        courses={courses}
        onLogin={setCurrentUser} 
      />
    );
  }

  // Visualização de Relatório
  if (currentView === 'print_report' && selectedStudentForReport) {
    const studentLogs = logs.filter(l => l.studentId === selectedStudentForReport.id).sort((a,b) => new Date(a.date) - new Date(b.date));
    const advisor = getMyAdvisor(selectedStudentForReport.id);
    
    return (
      <PrintableReport 
        student={selectedStudentForReport} 
        advisor={advisor} 
        logs={studentLogs} 
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  const getRoleName = (role) => {
    switch(role) {
        case 'admin_global': return 'Admin Geral (Global)';
        case 'admin_university': return 'Institucional N1 (Universidade)';
        case 'admin_school': return 'Institucional N2 (Escola)';
        case 'professor': return 'Docente';
        case 'student': return 'Discente';
        default: return 'Usuário';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold">MentorFlow</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Versão Conectada (Firebase)</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          
          {currentUser.role === 'admin_global' && <NavItem icon={<Building size={20}/>} label="Universidades (N1)" active={currentView === 'users'} onClick={() => setCurrentView('users')} />}
          {currentUser.role === 'admin_university' && <NavItem icon={<Landmark size={20}/>} label="Escolas (N2)" active={currentView === 'users'} onClick={() => setCurrentView('users')} />}
          {currentUser.role === 'admin_school' && (
            <>
              <NavItem icon={<Users size={20}/>} label="Cadastros" active={currentView === 'users'} onClick={() => setCurrentView('users')} />
              <NavItem icon={<UserPlus size={20}/>} label="Vínculos" active={currentView === 'allocations'} onClick={() => setCurrentView('allocations')} />
            </>
          )}
          {currentUser.role === 'student' && <NavItem icon={<FileText size={20}/>} label="Meus Registros" active={currentView === 'my_logs'} onClick={() => setCurrentView('my_logs')} />}
          {currentUser.role === 'professor' && (
            <>
              <NavItem icon={<ClipboardList size={20}/>} label="Gestão" active={currentView === 'approvals'} onClick={() => setCurrentView('approvals')} />
              <NavItem icon={<Archive size={20}/>} label="Concluídas" active={currentView === 'history'} onClick={() => setCurrentView('history')} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{getRoleName(currentUser.role)}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 text-sm text-red-300 hover:text-red-200 w-full">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
           {/* Renderização Condicional das Views com Props de Ação DB */}
           {(currentUser.role === 'admin_global' || currentUser.role === 'admin_university' || currentUser.role === 'admin_school') && (
             <AdminDashboard 
                user={currentUser} view={currentView} users={users} courses={courses} relationships={relationships} 
                onAddUser={handleAddUserDB} onAllocate={handleAllocationDB} onRemoveLink={handleRemoveLinkDB}
             />
           )}

           {currentUser.role === 'student' && (
             <StudentDashboard 
                view={currentView} user={currentUser} logs={logs} advisor={getMyAdvisor(currentUser.id)}
                onAddLog={handleAddLogDB}
             />
           )}

           {currentUser.role === 'professor' && (
             <ProfessorDashboard 
                view={currentView} user={currentUser} users={users} relationships={relationships} logs={logs}
                onUpdateLog={handleUpdateLogDB} onArchiveLink={(id) => handleRemoveLinkDB(id, 'archive')}
                onGenerateReport={(student) => { setSelectedStudentForReport(student); setCurrentView('print_report'); }}
             />
           )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
      {icon} <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function LandingPage({ users, courses, onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState("");

  // Helper para criar o primeiro admin se o banco estiver vazio
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [setupData, setSetupData] = useState({ name: 'Admin Inicial', email: 'admin@sistema.edu', password: '123' });

  // Se não houver usuários, mostrar tela de Setup
  if (users.length === 0 && !isFirstSetup) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="text-center max-w-md">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4"><Database size={32}/></div>
                  <h1 className="text-2xl font-bold mb-2">Banco de Dados Conectado!</h1>
                  <p className="text-slate-500 mb-6">A conexão com o Firebase funcionou, mas ainda não há usuários. Vamos criar o primeiro administrador.</p>
                  <button onClick={() => setIsFirstSetup(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">Criar Admin Geral</button>
              </div>
          </div>
      )
  }

  // Tela de Criação do Primeiro Admin (Salva no Firebase)
  if (isFirstSetup) {
      // Como não temos acesso à função handleAddUserDB aqui fora, vamos usar o Firestore direto
      const createFirstAdmin = async (e) => {
          e.preventDefault();
          try {
              await addDoc(collection(db, "users"), {
                  ...setupData,
                  role: 'admin_global',
                  createdAt: new Date().toISOString()
              });
              setIsFirstSetup(false); // Volta para login normal, que agora terá o user
          } catch (e) {
              alert("Erro: " + e.message);
          }
      };

      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4">Configuração Inicial</h2>
                  <form onSubmit={createFirstAdmin} className="space-y-4">
                      <input placeholder="Nome" className="w-full border p-2 rounded" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} required />
                      <input placeholder="Email" className="w-full border p-2 rounded" value={setupData.email} onChange={e => setSetupData({...setupData, email: e.target.value})} required />
                      <input placeholder="Senha" type="password" className="w-full border p-2 rounded" value={setupData.password} onChange={e => setSetupData({...setupData, password: e.target.value})} required />
                      <button className="w-full bg-green-600 text-white py-2 rounded font-bold">Salvar e Entrar</button>
                  </form>
              </div>
          </div>
      )
  }

  const handleAuth = (e) => {
    e.preventDefault();
    if(password === selectedUser.password) {
        onLogin(selectedUser);
    } else {
        alert("Senha incorreta");
    }
  };

  if (selectedUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-md animate-in zoom-in duration-300">
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 mb-4 hover:text-slate-600 flex items-center gap-1"><ArrowRight className="rotate-180" size={16}/> Voltar</button>
                <h2 className="text-xl font-bold mb-1">Olá, {selectedUser.name}</h2>
                <p className="text-slate-500 text-sm mb-6">Confirme sua identidade para continuar.</p>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="password" autoFocus placeholder="Senha" className="w-full p-3 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} />
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">Acessar Painel</button>
                </form>
                <p className="text-center text-xs text-slate-300 mt-4">Ambiente Seguro • Firebase</p>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
            <div>
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4">MentorFlow <span className="text-blue-600 text-base align-top px-2 py-1 bg-blue-50 rounded-full">Cloud</span></h1>
                <p className="text-lg text-slate-600 mb-8">O sistema está conectado ao banco de dados em nuvem. Selecione um perfil para visualizar os dados reais carregados.</p>
                <div className="flex gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> Database Online</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div> Auth Ready</div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-h-[500px] overflow-y-auto">
                <h3 className="font-bold text-slate-700 mb-4 sticky top-0 bg-white pb-2 border-b">Usuários Cadastrados no Banco</h3>
                <div className="space-y-2">
                    {users.map(u => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-3 border rounded-lg hover:bg-blue-50 text-left flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role.includes('admin') ? 'bg-purple-500' : 'bg-emerald-500'}`}>{u.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 truncate">{u.name}</p>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300"/>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}

// ---------------- DASHBOARDS ----------------

function AdminDashboard({ user, view, users, relationships, onAddUser, onAllocate, onRemoveLink }) {
  const [newUser, setNewUser] = useState({ 
    name: '', email: '', role: 'student', institutionName: '', course: '', level: 'Graduação', minSessions: 5,
    limits: { schools: 0, professors: 0, students: 0 }, password: '123'
  });
  const [allocation, setAllocation] = useState({ studentIds: [], professorId: '' });

  const managedUsers = users.filter(u => {
      if (user.role === 'admin_global') return u.role === 'admin_university';
      if (user.role === 'admin_university') return u.role === 'admin_school' && u.parentId === user.id;
      if (user.role === 'admin_school') return (u.role === 'student' || u.role === 'professor') && u.schoolId === user.id;
      return false;
  });

  if (view === 'dashboard') {
      return <div className="p-10 text-center"><h2 className="text-2xl font-bold">Painel Conectado</h2><p className="text-slate-500">{managedUsers.length} registros gerenciados</p></div>; 
  }

  if (view === 'users') {
      return (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded shadow">
                  <h3 className="font-bold mb-4">Novo Cadastro (Salva no Firebase)</h3>
                  <form onSubmit={(e) => { e.preventDefault(); onAddUser({...newUser, parentId: user.id, schoolId: user.id}); }} className="grid gap-4">
                      <input placeholder="Nome" className="border p-2 rounded" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                      <input placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                      <input placeholder="Senha" className="border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                      
                      {user.role === 'admin_school' && (
                          <select className="border p-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                              <option value="student">Aluno</option>
                              <option value="professor">Professor</option>
                          </select>
                      )}
                      
                      {user.role === 'admin_global' && <input placeholder="Nome Universidade" className="border p-2 rounded" value={newUser.institutionName} onChange={e => setNewUser({...newUser, institutionName: e.target.value, role: 'admin_university'})} />}
                      {user.role === 'admin_university' && <input placeholder="Nome Escola/Faculdade" className="border p-2 rounded" value={newUser.institutionName} onChange={e => setNewUser({...newUser, institutionName: e.target.value, role: 'admin_school'})} />}

                      <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Salvar no Banco</button>
                  </form>
              </div>
              
              <div className="bg-white rounded shadow overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Função</th></tr></thead>
                      <tbody>
                          {managedUsers.map(u => (
                              <tr key={u.id} className="border-b last:border-0">
                                  <td className="p-3">{u.name} {u.institutionName && `(${u.institutionName})`}</td>
                                  <td className="p-3 text-slate-500">{u.email}</td>
                                  <td className="p-3 capitalize">{u.role}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )
  }

  if (view === 'allocations') {
      const students = users.filter(u => u.role === 'student' && u.schoolId === user.id);
      const professors = users.filter(u => u.role === 'professor' && u.schoolId === user.id);
      
      return (
          <div className="bg-white p-6 rounded shadow">
              <h3 className="font-bold mb-4">Vincular Orientador (Firebase)</h3>
              <div className="grid gap-4">
                  <select className="border p-2 rounded" value={allocation.professorId} onChange={e => setAllocation({...allocation, professorId: e.target.value})}>
                      <option value="">Selecione Professor...</option>
                      {professors.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="border rounded max-h-40 overflow-y-auto p-2">
                      {students.map(s => (
                          <label key={s.id} className="flex gap-2 p-1 hover:bg-slate-50 cursor-pointer">
                              <input type="checkbox" checked={allocation.studentIds.includes(s.id)} onChange={(e) => {
                                  if(e.target.checked) setAllocation(prev => ({...prev, studentIds: [...prev.studentIds, s.id]}));
                                  else setAllocation(prev => ({...prev, studentIds: prev.studentIds.filter(id => id !== s.id)}));
                              }}/> {s.name}
                          </label>
                      ))}
                  </div>
                  <button onClick={() => onAllocate(allocation.studentIds, allocation.professorId)} className="bg-green-600 text-white p-2 rounded">Salvar Vínculos</button>
              </div>
          </div>
      )
  }
  return null;
}

function StudentDashboard({ view, user, logs, advisor, onAddLog }) {
    const [newLog, setNewLog] = useState({ date: '', content: '', type: 'presencial' });
    const myLogs = logs.filter(l => l.studentId === user.id);

    if (view === 'dashboard') return <div className="p-10 text-center"><h2 className="text-2xl font-bold">Meu Progresso</h2><p>{myLogs.length} orientações registradas</p></div>;

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow h-fit">
                <h3 className="font-bold mb-4">Nova Orientação</h3>
                <div className="grid gap-3">
                    <input type="date" className="border p-2 rounded" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    <div className="flex gap-2 text-sm">
                        <label className="flex items-center gap-1"><input type="radio" name="type" value="presencial" checked={newLog.type === 'presencial'} onChange={e => setNewLog({...newLog, type: 'presencial'})}/> Presencial</label>
                        <label className="flex items-center gap-1"><input type="radio" name="type" value="online" checked={newLog.type === 'online'} onChange={e => setNewLog({...newLog, type: 'online'})}/> Online</label>
                    </div>
                    <textarea className="border p-2 rounded" rows="4" placeholder="Detalhes..." value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})}></textarea>
                    <button onClick={() => onAddLog({...newLog, studentId: user.id})} className="bg-blue-600 text-white p-2 rounded">Enviar</button>
                </div>
            </div>
            <div className="md:col-span-2 space-y-4">
                {myLogs.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded shadow border flex justify-between items-start">
                        <div>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                {new Date(log.date).toLocaleDateString()} 
                                <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 rounded">{log.type}</span>
                            </p>
                            <p className="text-slate-600 mt-1">{log.content}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{log.status}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ProfessorDashboard({ view, user, relationships, logs, users, onUpdateLog, onGenerateReport, onArchiveLink }) {
    const myRels = relationships.filter(r => r.professorId === user.id && r.status === 'active');
    const myStudentIds = myRels.map(r => r.studentId);
    const pendingLogs = logs.filter(l => l.status === 'pending' && myStudentIds.includes(l.studentId));

    if (view === 'dashboard') return <div className="p-10 text-center"><h2 className="text-2xl font-bold">Painel Docente</h2><p>{myRels.length} orientandos ativos</p></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded shadow">
                <h3 className="font-bold mb-4 text-yellow-600">Aprovações Pendentes ({pendingLogs.length})</h3>
                <div className="space-y-4">
                    {pendingLogs.map(log => {
                        const st = users.find(u => u.id === log.studentId);
                        return (
                            <div key={log.id} className="border p-4 rounded flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{st?.name} <span className="text-xs font-normal text-slate-500">({new Date(log.date).toLocaleDateString()})</span></p>
                                    <p className="text-sm text-slate-600">{log.content}</p>
                                </div>
                                <button onClick={() => onUpdateLog(log.id, { status: 'approved' })} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Aprovar</button>
                            </div>
                        )
                    })}
                    {pendingLogs.length === 0 && <p className="text-slate-400 italic">Nenhuma pendência.</p>}
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
                <h3 className="font-bold mb-4 text-blue-600">Meus Orientandos</h3>
                <div className="space-y-2">
                    {myRels.map(rel => {
                        const st = users.find(u => u.id === rel.studentId);
                        if (!st) return null;
                        return (
                            <div key={rel.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border-b">
                                <span className="font-bold text-slate-700">{st.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => onGenerateReport(st)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm">Relatório</button>
                                    <button onClick={() => onArchiveLink(rel.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm">Encerrar</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function PrintableReport({ student, advisor, logs, onBack }) {
    return (
        <div className="bg-white min-h-screen text-black p-8">
            <button onClick={onBack} className="print:hidden mb-4 text-blue-600">Voltar</button>
            <h1 className="text-2xl font-bold text-center border-b-2 border-black pb-4 mb-8">Relatório de Orientação</h1>
            <div className="grid grid-cols-2 gap-4 mb-8 border p-4">
                <div><span className="font-bold">Aluno:</span> {student.name}</div>
                <div><span className="font-bold">Orientador:</span> {advisor?.name}</div>
            </div>
            <table className="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">Data</th>
                        <th className="border border-black p-2">Tipo</th>
                        <th className="border border-black p-2">Atividade</th>
                        <th className="border border-black p-2">Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id}>
                            <td className="border border-black p-2">{new Date(log.date).toLocaleDateString()}</td>
                            <td className="border border-black p-2 capitalize">{log.type}</td>
                            <td className="border border-black p-2">{log.content}</td>
                            <td className="border border-black p-2 text-center text-xs">{log.status === 'approved' ? 'DE ACORDO' : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-8 text-center text-xs">Documento gerado pelo MentorFlow</div>
        </div>
    )
}