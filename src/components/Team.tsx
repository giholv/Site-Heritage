import React, { useState } from 'react';
import { motion } from 'framer-motion';

const members = [
  { name: 'Caio Pires', role: 'caiopires@uni9.edu.br', image: 'fotoCaiojpg.png' },
  { name: 'Gabriel Alencar', role: 'alencar.pacheco@uni9.edu.br', image: 'foto_pacheco.png' },
  { name: 'Gabriel Sartori', role: 'gabrielsartori@uni9.edu.br', image: 'foto_gabriel.png' },
  { name: 'João Henrique', role: 'joao.ribeiron@uni9.edu.br', image: 'foto_joão.png' },
  { name: 'Kailany Rodrigues', role: 'skailany2004@uni9.edu.br', image: 'foto_kailany.png' },
  { name: 'Leandro Jesus', role: 'leandro.jesuso@uni9.edu.br', image: 'foto_leandro.png' },
  { name: 'Otávio Guilherme', role: 'otaviorhein@uni9.edu.br', image: 'foto_otavio.png' },
];

type Member = (typeof members)[number];

const MemberCard: React.FC<{ member: Member; index: number }> = ({ member, index }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      whileHover={{
        y: -6,
        scale: 1.03,
      }}
    >
      <div className="relative w-40 h-40 mb-4">
        {/* Skeleton */}
        <div
          className={`absolute inset-0 rounded-full bg-gray-200 animate-pulse ${
            loaded ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Foto */}
        <div className="w-full h-full rounded-full overflow-hidden shadow-xl border border-white/40 bg-white/70 backdrop-blur-md">
          <img
            src={member.image}
            alt={member.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>

      <motion.div
        className="px-3 py-2 rounded-2xl bg-white/70 backdrop-blur-md shadow-md border border-gray-100 max-w-xs"
        whileHover={{ boxShadow: '0 15px 40px rgba(15,23,42,0.18)' }}
      >
        <h4 className="text-lg font-semibold text-gray-900 leading-tight">
          {member.name}
        </h4>
        <p className="text-sm text-gray-600 break-all">{member.role}</p>
      </motion.div>
    </motion.div>
  );
};

const Team: React.FC = () => {
  return (
    <section id="team" className="relative min-h-screen flex items-center overflow-hidden bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Nosso Time
        </motion.h2>

        <motion.p
          className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Conheça as pessoas por trás desse projeto.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 justify-center">
            {members.map((member, index) => (
              <MemberCard key={index} member={member} index={index} />
            ))}
          </div>
      </div>
    </section>
  );
};

export default Team;
