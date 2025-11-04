import { useState, useEffect, useRef } from 'react';
import { Clock, Volume2, VolumeX, MapPin, Sunrise, Sun, Sunset, Moon, Star } from 'lucide-react';

interface PrayerTime {
  name: string;
  time: string;
  icon: React.ComponentType<any>;
  arabicName: string;
}

const JadwalShalatPage = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; timeLeft: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('adhanSoundEnabled') !== 'false';
  });
  const [lastPlayedPrayer, setLastPlayedPrayer] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tangerang Selatan coordinates (approximate)
  const TANGERANG_SELATAN_LAT = -6.2614;
  const TANGERANG_SELATAN_LNG = 106.7447;

  // Calculate prayer times for Tangerang Selatan
  const calculatePrayerTimes = (date: Date): PrayerTime[] => {
    // Prayer times for Tangerang Selatan - accurate schedule
    const prayers: PrayerTime[] = [
      {
        name: 'Subuh',
        time: '04:32',
        icon: Star,
        arabicName: 'الفجر'
      },
      {
        name: 'Zuhur',
        time: '11:51',
        icon: Sun,
        arabicName: 'الظهر'
      },
      {
        name: 'Asar',
        time: '15:06',
        icon: Sunrise,
        arabicName: 'العصر'
      },
      {
        name: 'Magrib',
        time: '17:52',
        icon: Sunset,
        arabicName: 'المغرب'
      },
      {
        name: 'Isya',
        time: '19:01',
        icon: Moon,
        arabicName: 'العشاء'
      }
    ];

    return prayers;
  };

  // Calculate time until next prayer
  const calculateNextPrayer = (prayers: PrayerTime[], currentTime: Date) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      if (prayerMinutes > now) {
        const diff = prayerMinutes - now;
        const hoursLeft = Math.floor(diff / 60);
        const minutesLeft = diff % 60;
        
        return {
          name: prayer.name,
          timeLeft: `${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}`
        };
      }
    }
    
    // If no prayer left today, next is Subuh tomorrow
    const subuhMinutes = 4 * 60 + 32; // 04:32
    const minutesUntilMidnight = (24 * 60) - now;
    const totalMinutes = minutesUntilMidnight + subuhMinutes;
    const hoursLeft = Math.floor(totalMinutes / 60);
    const minutesLeft = totalMinutes % 60;
    
    return {
      name: 'Subuh',
      timeLeft: `${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}`
    };
  };

  // Check if it's prayer time and play adhan
  const checkPrayerTime = (prayers: PrayerTime[], currentTime: Date) => {
    const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    
    for (const prayer of prayers) {
      if (prayer.time === currentTimeStr) {
        const prayerKey = `${prayer.name}-${currentTime.toDateString()}`;
        
        // Only play once per prayer per day
        if (soundEnabled && lastPlayedPrayer !== prayerKey) {
          playAdhan();
          setLastPlayedPrayer(prayerKey);
          localStorage.setItem('lastPlayedPrayer', prayerKey);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Waktu ${prayer.name}`, {
              body: `Saatnya melaksanakan shalat ${prayer.name}`,
              icon: '/afc-logo.png'
            });
          }
        }
        break;
      }
    }
  };

  // Play adhan sound
  const playAdhan = async () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.8; // Set volume to 80%
        
        // Ensure audio is loaded
        if (audioRef.current.readyState < 2) {
          await new Promise((resolve) => {
            audioRef.current!.addEventListener('canplay', resolve, { once: true });
            audioRef.current!.load();
          });
        }
        
        const playPromise = audioRef.current.play();
        await playPromise;
        console.log('Adhan played successfully');
      } catch (error) {
        console.error('Error playing adhan:', error);
        
        // Fallback: try to play after user interaction
        const playAfterInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(console.error);
          }
          document.removeEventListener('click', playAfterInteraction);
        };
        document.addEventListener('click', playAfterInteraction);
      }
    }
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const prayers = calculatePrayerTimes(now);
      setPrayerTimes(prayers);
      
      const next = calculateNextPrayer(prayers, now);
      setNextPrayer(next);
      
      checkPrayerTime(prayers, now);
    }, 1000);

    return () => clearInterval(timer);
  }, [soundEnabled, lastPlayedPrayer]);

  // Initialize prayer times on mount
  useEffect(() => {
    const now = new Date();
    const prayers = calculatePrayerTimes(now);
    setPrayerTimes(prayers);
    setNextPrayer(calculateNextPrayer(prayers, now));
    
    // Get last played prayer from localStorage
    const saved = localStorage.getItem('lastPlayedPrayer');
    if (saved) setLastPlayedPrayer(saved);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Initialize audio element
    if (audioRef.current) {
      audioRef.current.load();
      
      // Add event listeners for audio debugging
      audioRef.current.addEventListener('loadstart', () => console.log('Audio loading started'));
      audioRef.current.addEventListener('canplay', () => console.log('Audio can play'));
      audioRef.current.addEventListener('error', (e) => console.error('Audio error:', e));
    }
  }, []);

  // Save sound preference
  useEffect(() => {
    localStorage.setItem('adhanSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-4 pb-24">
      {/* Audio element for adhan */}
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        src="/wwd.mp3juice.blog - The Adhan - Omar Hisham Al Arabi الأذان بصوت عمر هشام العربي The Call to Prayer (320 KBps) (1).mp3"
      />

      {/* Mobile Layout */}
      <div className="block lg:hidden max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center bg-white rounded-2xl shadow-lg p-6 border border-green-100">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-green-600" />
            <h1 className="text-xl font-bold text-gray-800">Jadwal Shalat</h1>
          </div>
          <p className="text-green-600 font-semibold">Tangerang Selatan</p>
          <p className="text-sm text-gray-600 mt-2">{formatDate(currentTime)}</p>
          <p className="text-lg font-mono text-gray-800 mt-1">{formatTime(currentTime)}</p>
        </div>

        {/* Sound Control */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-green-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium text-gray-800">Suara Adzan</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Test play adhan
                  playAdhan();
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all duration-200"
              >
                Test
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  soundEnabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Next Prayer Countdown */}
        {nextPrayer && (
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg p-6 text-white">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <h2 className="text-lg font-bold mb-1">Shalat Selanjutnya</h2>
              <p className="text-2xl font-bold mb-1">{nextPrayer.name}</p>
              <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-sm opacity-90 mb-1">Waktu tersisa:</p>
                <p className="text-3xl font-mono font-bold">{nextPrayer.timeLeft}</p>
              </div>
            </div>
          </div>
        )}

        {/* Prayer Times List */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4">
            <h2 className="text-lg font-bold text-white text-center">Jadwal Waktu Shalat</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {prayerTimes.map((prayer, index) => {
              const Icon = prayer.icon;
              const isNext = nextPrayer?.name === prayer.name;
              const now = currentTime.getHours() * 60 + currentTime.getMinutes();
              const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
              const prayerTime = prayerHours * 60 + prayerMinutes;
              const isPassed = prayerTime <= now && !isNext;
              
              return (
                <div
                  key={prayer.name}
                  className={`p-4 flex items-center justify-between transition-all duration-200 ${
                    isNext
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500'
                      : isPassed
                      ? 'bg-gray-50 opacity-60'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      isNext
                        ? 'bg-green-100 text-green-600'
                        : isPassed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${
                        isNext ? 'text-green-700' : isPassed ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {prayer.name}
                      </h3>
                      <p className={`text-sm ${
                        isNext ? 'text-green-600' : isPassed ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {prayer.arabicName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-mono font-bold ${
                      isNext ? 'text-green-700' : isPassed ? 'text-gray-400' : 'text-gray-800'
                    }`}>
                      {prayer.time}
                    </p>
                    {isNext && (
                      <p className="text-xs text-green-600 font-medium">Selanjutnya</p>
                    )}
                    {isPassed && (
                      <p className="text-xs text-gray-400">Selesai</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="text-center">
            <p className="text-sm text-blue-700 mb-2">
              <span className="font-semibold">Lokasi:</span> Tangerang Selatan, Banten
            </p>
            <p className="text-xs text-blue-600">
              Waktu shalat berdasarkan perhitungan untuk wilayah Tangerang Selatan.
              Suara adzan akan berbunyi otomatis saat memasuki waktu shalat.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block w-full max-w-7xl mx-auto space-y-6">
        {/* Top Row - Left: Header & Sound Control, Right: Next Prayer */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="h-6 w-6 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-800">Jadwal Shalat</h1>
              </div>
              <p className="text-green-600 font-semibold text-lg">Tangerang Selatan</p>
              <p className="text-gray-600 mt-2">{formatDate(currentTime)}</p>
              <p className="text-xl font-mono text-gray-800 mt-1">{formatTime(currentTime)}</p>
            </div>

            {/* Sound Control */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <VolumeX className="h-6 w-6 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-800 text-lg">Suara Adzan</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-lg ${
                    soundEnabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Next Prayer */}
          {nextPrayer && (
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl shadow-lg p-8 text-white">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Shalat Selanjutnya</h2>
                <p className="text-4xl font-bold mb-4">{nextPrayer.name}</p>
                <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-lg opacity-90 mb-2">Waktu tersisa:</p>
                  <p className="text-5xl font-mono font-bold">{nextPrayer.timeLeft}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full Width Prayer Times List */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6">
            <h2 className="text-2xl font-bold text-white text-center">Jadwal Waktu Shalat</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {prayerTimes.map((prayer, index) => {
              const Icon = prayer.icon;
              const isNext = nextPrayer?.name === prayer.name;
              const now = currentTime.getHours() * 60 + currentTime.getMinutes();
              const [prayerHours, prayerMinutes] = prayer.time.split(':').map(Number);
              const prayerTime = prayerHours * 60 + prayerMinutes;
              const isPassed = prayerTime <= now && !isNext;
              
              return (
                <div
                  key={prayer.name}
                  className={`p-6 flex items-center justify-between transition-all duration-200 ${
                    isNext
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500'
                      : isPassed
                      ? 'bg-gray-50 opacity-60'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-lg ${
                      isNext
                        ? 'bg-green-100 text-green-600'
                        : isPassed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${
                        isNext ? 'text-green-700' : isPassed ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {prayer.name}
                      </h3>
                      <p className={`text-lg ${
                        isNext ? 'text-green-600' : isPassed ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {prayer.arabicName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-2xl font-mono font-bold ${
                      isNext ? 'text-green-700' : isPassed ? 'text-gray-400' : 'text-gray-800'
                    }`}>
                      {prayer.time}
                    </p>
                    {isNext && (
                      <p className="text-sm text-green-600 font-medium">Selanjutnya</p>
                    )}
                    {isPassed && (
                      <p className="text-sm text-gray-400">Selesai</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Width Info */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <div className="text-center">
            <p className="text-lg text-blue-700 mb-3">
              <span className="font-semibold">Lokasi:</span> Tangerang Selatan, Banten
            </p>
            <p className="text-blue-600">
              Waktu shalat berdasarkan perhitungan untuk wilayah Tangerang Selatan.
              Suara adzan akan berbunyi otomatis saat memasuki waktu shalat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JadwalShalatPage;
