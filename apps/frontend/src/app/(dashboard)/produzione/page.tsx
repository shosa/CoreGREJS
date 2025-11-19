'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { produzioneApi } from '@/lib/api';
import { showError } from '@/store/notifications';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ProduzionePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const data = await produzioneApi.getCalendar(currentMonth, currentYear);
      setCalendarData(data);
    } catch (error) {
      showError('Errore nel caricamento del calendario');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const handleDayClick = (day: number) => {
    const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    router.push(`/produzione/${date}`);
  };

  const renderCalendar = () => {
    if (!calendarData) return null;

    const { daysInMonth, firstDayOfWeek, daysWithData } = calendarData;
    const days = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = daysWithData[day];
      const isToday =
        day === new Date().getDate() &&
        currentMonth === new Date().getMonth() + 1 &&
        currentYear === new Date().getFullYear();

      days.push(
        <motion.div
          key={day}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleDayClick(day)}
          className={`h-24 p-2 rounded-lg cursor-pointer transition-all border ${
            isToday
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
              : dayData?.hasData
              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${
              isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {day}
            </span>
            {dayData?.hasData && (
              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">
                {dayData.total}
              </span>
            )}
          </div>
          {isToday && (
            <span className="text-[10px] text-orange-500 font-medium">Oggi</span>
          )}
        </motion.div>
      );
    }

    return days;
  };

  if (loading && !calendarData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-solid border-yellow-500 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Produzione
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Calendario della produzione giornaliera
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <Link href="/produzione/statistics">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:bg-gray-800 dark:text-purple-300"
              >
                <i className="fas fa-chart-line mr-2"></i>
                Statistiche
              </motion.button>
            </Link>
            <motion.button
              onClick={goToToday}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              <i className="fas fa-calendar-day mr-2"></i>
              Oggi
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.nav variants={itemVariants} className="flex mb-8">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400">
              <i className="fas fa-home mr-2"></i>Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <i className="fas fa-chevron-right text-gray-400 mx-2"></i>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Produzione</span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Calendar Navigation */}
      <motion.div
        variants={itemVariants}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center justify-between">
          <motion.button
            onClick={prevMonth}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <i className="fas fa-chevron-left"></i>
          </motion.button>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {MONTHS[currentMonth - 1]} {currentYear}
          </h2>

          <motion.button
            onClick={nextMonth}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <i className="fas fa-chevron-right"></i>
          </motion.button>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
      >
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900">
          {DAYS.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 p-2">
          {renderCalendar()}
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div variants={itemVariants} className="mt-6 flex items-center justify-center space-x-6">
        <div className="flex items-center">
          <div className="h-4 w-4 rounded border border-orange-400 bg-orange-50 dark:bg-orange-900/20 mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Oggi</span>
        </div>
        <div className="flex items-center">
          <div className="h-4 w-4 rounded border border-green-300 bg-green-50 dark:bg-green-900/20 mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Con dati</span>
        </div>
        <div className="flex items-center">
          <div className="h-4 w-4 rounded border border-gray-200 dark:border-gray-700 mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Vuoto</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
