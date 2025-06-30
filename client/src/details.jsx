import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCcw,
  Search,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import debounce from "lodash/debounce";

function Button({ children, onClick, size = "md", variant = "default", className = "" }) {
  const sizes = { icon: "p-2", md: "px-4 py-2" };
  const variants = {
    default: "bg-sky-500 text-white hover:bg-sky-600",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700",
    outline:
      "border border-gray-300 text-gray-700 dark:text-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800",
    menu: "bg-transparent hover:border-2 hover:border-white transition-all duration-200",
    loading: "bg-gray-300 text-gray-500 cursor-not-allowed",
  };

  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} ${variants[variant]} rounded ${className}`}
      disabled={variant === "loading"}
    >
      {variant === "loading" ? <Loader2 className="animate-spin" /> : children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white dark:bg-gray-800 rounded-xl shadow ${className}`}>{children}</div>;
}

function CardContent({ children }) {
  return (
    <div className="w-full max-h-[calc(100vh-250px)] overflow-y-auto overflow-x-hidden">
      {children}
    </div>
  );
}

function Alert({ message, type = "error", onClose }) {
  return (
    <div
      className={`fixed top-4 right-4 p-4 rounded-lg z-50 ${
        type === "error"
          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
      }`}
    >
      {message}
      <button onClick={onClose} className="ml-4 text-sm">×</button>
    </div>
  );
}

function FlightTrackingTable() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState({ field: "date", ascending: true });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tailNumber");
  const filterRef = useRef(null);
  const [searchInput, setSearchInput] = useState("");
  const toggleSidebar = () => setCollapsed(!collapsed);

  const menuItems = [
    { name: "Home", path: "/" },
    { name: "Flight Logs", path: "/details" },
    { name: "Cost Details", path: "/calculator" },
    { name: "Logout", path: "/" },
  ];

  const handleMenuClick = (path) => {
    navigate(path);
  };

  const fetchFlights = async () => {
    setLoading(true);
    try {
      const cachedData = localStorage.getItem("flightData");
      if (cachedData) {
        setFlights(JSON.parse(cachedData));
      }
      const res = await axios.get("https://airport-skzq.onrender.com/flights-with-durations");
      const flightLogs = res.data;

      const flightMap = {};
      flightLogs.forEach((log) => {
        const key = `${log.tailNumber}_${log.date}`;
        if (!flightMap[key]) {
          flightMap[key] = { departing: null, arriving: null };
        }
        if (
          log.status === "Completed" &&
          log.outboundTime !== "—" &&
          log.inboundTime !== "—"
        ) {
          flightMap[key] = {
            departing: { time: log.outboundTime, status: "Completed" },
            arriving: { time: log.inboundTime, status: "Completed" },
          };
        } else if (log.outboundTime !== "—" && !flightMap[key].arriving) {
          flightMap[key].departing = { time: log.outboundTime, status: "In Progress" };
        } else if (log.inboundTime !== "—" && flightMap[key].departing) {
          flightMap[key].arriving = { time: log.inboundTime, status: "Completed" };
        }
      });

      const formattedFlights = Object.values(flightMap).map((flight) => {
        const departureTime = new Date(`1970-01-01 ${flight.departing.time}`);
        const arrivalTime = flight.arriving
          ? new Date(`1970-01-01 ${flight.arriving.time}`)
          : null;
        let duration = "—";
        if (arrivalTime && !isNaN(arrivalTime.getTime())) {
          const diffMs = arrivalTime - departureTime;
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const minutes = diffMins % 60;
          duration = `${hours}h ${minutes}m`;
        }

        const matchingLog = flightLogs.find(
          (f) =>
            f.tailNumber ===
              flightLogs.find((fl) => fl.outboundTime === flight.departing.time)
                ?.tailNumber &&
            f.date ===
              flightLogs.find((fl) => fl.outboundTime === flight.departing.time)?.date
        ) || flightLogs[0];
        return {
          date: matchingLog?.date || "Unknown",
          tailNumber: matchingLog?.tailNumber || "Unknown",
          outboundTime: flight.departing.time,
          inboundTime: flight.arriving ? flight.arriving.time : "—",
          duration: duration,
          status: flight.arriving ? "Completed" : "In Progress",
          departureVideo: "https://dummyvideo1.com",
          arrivalVideo: flight.arriving ? "https://dummyvideo2.com" : "Not Available",
        };
      });

      setFlights(formattedFlights);
      localStorage.setItem("flightData", JSON.stringify(formattedFlights));
      setAlert({ message: "Data refreshed successfully!", type: "success" });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      console.error("Error fetching flight logs:", err);
      setAlert({ message: "Failed to refresh data.", type: "error" });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse search input to detect tail number, date, or status
  const parseSearchInput = (input) => {
    const filters = [];
    
    // Tail number pattern (e.g., VT-SBR)
    const tailNumberRegex = /[A-Z0-9]{4,6}|VT-[A-Z0-9]{3}/i;
    const tailMatch = input.match(tailNumberRegex);
    if (tailMatch) {
      filters.push({ field: "tailNumber", value: tailMatch[0] });
    }

    // Date pattern (e.g., June 18, 2024)
    const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i;
    const dateMatch = input.match(dateRegex);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[0]);
      if (!isNaN(parsedDate)) {
        filters.push({ field: "date", value: parsedDate.toISOString().split("T")[0] });
      }
    }

    // Status pattern (e.g., Completed, In Progress)
    const statusRegex = /completed|in progress/i;
    const statusMatch = input.match(statusRegex);
    if (statusMatch) {
      filters.push({ field: "status", value: statusMatch[0].toLowerCase() });
    }

    // If no specific matches, treat as general text search
    if (filters.length === 0 && input.trim()) {
      filters.push({ field: "text", value: input.trim() });
    }

    return filters;
  };

  // Debounced filter handler
  const debouncedSetFilter = useCallback(
    debounce((value) => {
      const parsedFilters = parseSearchInput(value);
      setFilters((prev) => {
        const nonTextFilters = prev.filter(f => f.field !== "tailNumber" && f.field !== "date" && f.field !== "status" && f.field !== "text");
        return [...nonTextFilters, ...parsedFilters];
      });
    }, 50),
    []
  );

  // Handle filter change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetFilter(value);
  };

  // Handle filter selection
  const handleFilterSelect = (field, value) => {
    setFilters((prev) => {
      const existingFilter = prev.find(f => f.field === field && f.value === value);
      if (existingFilter) {
        return prev.filter(f => !(f.field === field && f.value === value));
      } else {
        return [...prev.filter(f => f.field !== field), { field, value }];
      }
    });
    setIsFilterOpen(false);
  };

  // Handle time filter selection
  const handleTimeFilterSelect = (field, value) => {
    setFilters((prev) => {
      const existingTimeFilter = prev.find(f => f.field === field && f.value === value);
      if (existingTimeFilter) {
        return prev.filter(f => !(f.field === field && f.value === value));
      } else {
        return [...prev.filter(f => f.field !== field), { field, value }];
      }
    });
    setIsFilterOpen(false);
  };

  // Handle reset filter
  const handleResetFilter = () => {
    setFilters([]);
    setSearchInput(""); // Clear search input on reset
    setIsFilterOpen(false);
  };

  // Extract unique tail numbers, months, and statuses
  const uniqueTailNumbers = useMemo(
    () => [...new Set(flights.map((flight) => flight.tailNumber))],
    [flights]
  );
  const uniqueMonths = useMemo(
    () =>
      [
        ...new Set(
          flights.map((flight) => new Date(flight.date).toLocaleString("default", { month: "long" }))
        ),
      ],
    [flights]
  );
  const uniqueStatuses = useMemo(
    () => [...new Set(flights.map((flight) => flight.status))],
    [flights]
  );

  // Generate time slots for 4-hour windows
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour += 4) {
      const start = `${hour.toString().padStart(2, "0")}:00`;
      const end = `${((hour + 4) % 24).toString().padStart(2, "0")}:00`;
      slots.push(`${start}-${end}`);
    }
    return slots;
  }, []);

  // Handle sort
  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      ascending: prev.field === field ? !prev.ascending : true,
    }));
  };

  // Memoized filtered and sorted flights
  const processedFlights = useMemo(() => {
    let result = [...flights];
    if (filters.length > 0) {
      filters.forEach(({ field, value }) => {
        if (field === "tailNumber") {
          result = result.filter(
            (flight) => flight.tailNumber.toLowerCase() === value.toLowerCase()
          );
        } else if (field === "month") {
          result = result.filter((flight) =>
            new Date(flight.date)
              .toLocaleString("default", { month: "long" })
              .toLowerCase() === value.toLowerCase()
          );
        } else if (field === "status") {
          result = result.filter(
            (flight) => flight.status.toLowerCase() === value.toLowerCase()
          );
        } else if (field === "date") {
          result = result.filter(
            (flight) => flight.date === value
          );
        } else if (field === "text") {
          result = result.filter((flight) =>
            Object.values(flight).some(
              (val) => String(val || "").toLowerCase().includes(value.toLowerCase())
            )
          );
        } else if (field === "outboundTime") {
          const [startTime] = value.split("-");
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const startMs = (startHour * 60 + startMinute) * 60 * 1000;
          const endMs = startMs + 4 * 60 * 60 * 1000;

          result = result.filter((flight) => {
            const parseTime = (time) => {
              if (time === "—") return null;
              const [timeStr, period] = time.split(" ");
              const [hours, minutes] = timeStr.split(":").map(Number);
              let totalHours = hours;
              if (period && period.toUpperCase() === "PM" && hours !== 12) totalHours += 12;
              if (period && period.toUpperCase() === "AM" && hours === 12) totalHours = 0;
              return (totalHours * 60 + minutes) * 60 * 1000;
            };

            const outboundMs = parseTime(flight.outboundTime);
            return outboundMs !== null && outboundMs >= startMs && outboundMs < endMs;
          });
        } else if (field === "inboundTime") {
          const [startTime] = value.split("-");
          const [startHour, startMinute] = startTime.split(":").map(Number);
          const startMs = (startHour * 60 + startMinute) * 60 * 1000;
          const endMs = startMs + 4 * 60 * 60 * 1000;

          result = result.filter((flight) => {
            const parseTime = (time) => {
              if (time === "—") return null;
              const [timeStr, period] = time.split(" ");
              const [hours, minutes] = timeStr.split(":").map(Number);
              let totalHours = hours;
              if (period && period.toUpperCase() === "PM" && hours !== 12) totalHours += 12;
              if (period && period.toUpperCase() === "AM" && hours === 12) totalHours = 0;
              return (totalHours * 60 + minutes) * 60 * 1000;
            };

            const inboundMs = parseTime(flight.inboundTime);
            return inboundMs !== null && inboundMs >= startMs && inboundMs < endMs;
          });
        }
      });
    }
    result.sort((a, b) => {
      if (sort.field === "date") {
        return sort.ascending
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      } else if (sort.field === "tailNumber") {
        return sort.ascending
          ? a.tailNumber.localeCompare(b.tailNumber)
          : b.tailNumber.localeCompare(a.tailNumber);
      }
      return 0;
    });
    return result;
  }, [flights, filters, sort]);

  // Handle Download as CSV
  const handleDownload = () => {
    try {
      const csv = [
        [
          "Date",
          "Tail Number",
          "Outbound Time",
          "Inbound Time",
          "Duration",
          "Status",
          "Departure Video",
          "Arrival Video",
        ],
        ...flights.map((flight) =>
          [
            `"${flight.date.replace(/"/g, '""')}"`,
            `"${flight.tailNumber.replace(/"/g, '""')}"`,
            `"${flight.outboundTime.replace(/"/g, '""')}"`,
            `"${flight.inboundTime.replace(/"/g, '""')}"`,
            `"${flight.duration.replace(/"/g, '""')}"`,
            `"${flight.status.replace(/"/g, '""')}"`,
            `"${flight.departureVideo.replace(/"/g, '""')}"`,
            `"${flight.arrivalVideo.replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flight_logs.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      setAlert({ message: "Download successful!", type: "success" });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      console.error("Error downloading CSV:", err);
      setAlert({ message: "Failed to download data.", type: "error" });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-[#1a2e44] text-white p-4 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          {!collapsed && <h1 className="text-xl font-bold">Menu</h1>}
          <Button
            size="icon"
            variant="ghost"
            className="text-white"
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>

        <div className="space-y-4">
          {menuItems.map((item, i) => (
            <Button
              key={i}
              variant="menu"
              className="w-full justify-start text-white hover:bg-[#2a3e54] transition-colors duration-200"
              onClick={() => handleMenuClick(item.path)}
            >
              {!collapsed && item.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 w-full">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                className="mr-2 border border-gray-300"
                onClick={() => navigate("/")}
              >
                <ArrowLeft size={20} />
              </Button>
              <h2 className="text-2xl font-bold">Flight Logs</h2>
            </div>
            <div className="flex space-x-2">
              <div className="relative group" ref={filterRef}>
                <Button
                  size="icon"
                  variant="outline"
                  className="border border-gray-300"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter />
                </Button>
                {isFilterOpen && (
                  <div className="absolute right-0 top-10 w-72 bg-white dark:bg-gray-900 border rounded-lg shadow-lg z-10 p-4">
                    {/* Tabs */}
                    <div className="flex space-x-2 mb-4 border-b overflow-x-auto">
                      <button
                        onClick={() => setActiveTab("tailNumber")}
                        className={`pb-2 px-2 ${
                          activeTab === "tailNumber"
                            ? "border-b-2 border-blue-500 text-blue-500"
                            : "text-gray-500 hover:text-gray-700"
                        } whitespace-nowrap`}
                      >
                        Tail Number
                      </button>
                      <button
                        onClick={() => setActiveTab("month")}
                        className={`pb-2 px-2 ${
                          activeTab === "month"
                            ? "border-b-2 border-blue-500 text-blue-500"
                            : "text-gray-500 hover:text-gray-700"
                        } whitespace-nowrap`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => setActiveTab("status")}
                        className={`pb-2 px-2 ${
                          activeTab === "status"
                            ? "border-b-2 border-blue-500 text-blue-500"
                            : "text-gray-500 hover:text-gray-700"
                        } whitespace-nowrap`}
                      >
                        Status
                      </button>
                      <button
                        onClick={() => setActiveTab("outboundTime")}
                        className={`pb-2 px-2 ${
                          activeTab === "outboundTime"
                            ? "border-b-2 border-blue-500 text-blue-500"
                            : "text-gray-500 hover:text-gray-700"
                        } whitespace-nowrap`}
                      >
                        Outbound Time
                      </button>
                      <button
                        onClick={() => setActiveTab("inboundTime")}
                        className={`pb-2 px-2 ${
                          activeTab === "inboundTime"
                            ? "border-b-2 border-blue-500 text-blue-500"
                            : "text-gray-500 hover:text-gray-700"
                        } whitespace-nowrap`}
                      >
                        Inbound Time
                      </button>
                    </div>

                    {/* Options */}
                    <div className="overflow-x-auto pb-4 max-h-32">
                      {activeTab === "tailNumber" &&
                        uniqueTailNumbers.map((tailNumber) => (
                          <button
                            key={tailNumber}
                            onClick={() => handleFilterSelect("tailNumber", tailNumber)}
                            className={`inline-block px-2 py-1 m-1 bg-blue-100 text-gray-700 rounded-full text-sm hover:bg-blue-200 transition-colors ${
                              filters.some(f => f.field === "tailNumber" && f.value === tailNumber)
                                ? "bg-blue-500 text-white"
                                : ""
                            }`}
                          >
                            {tailNumber}
                          </button>
                        ))}
                      {activeTab === "month" &&
                        uniqueMonths.map((month) => (
                          <button
                            key={month}
                            onClick={() => handleFilterSelect("month", month)}
                            className={`inline-block px-2 py-1 m-1 bg-blue-100 text-gray-700 rounded-full text-sm hover:bg-blue-200 transition-colors ${
                              filters.some(f => f.field === "month" && f.value === month)
                                ? "bg-blue-500 text-white"
                                : ""
                            }`}
                          >
                            {month}
                          </button>
                        ))}
                      {activeTab === "status" &&
                        uniqueStatuses.map((status) => (
                          <button
                            key={status}
                            onClick={() => handleFilterSelect("status", status)}
                            className={`inline-block px-2 py-1 m-1 bg-blue-100 text-gray-700 rounded-full text-sm hover:bg-blue-200 transition-colors ${
                              filters.some(f => f.field === "status" && f.value === status)
                                ? "bg-blue-500 text-white"
                                : ""
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      {(activeTab === "outboundTime" || activeTab === "inboundTime") &&
                        timeSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => handleTimeFilterSelect(activeTab, slot)}
                            className={`inline-block px-2 py-1 m-1 bg-blue-100 text-gray-700 rounded-full text-sm hover:bg-blue-200 transition-colors whitespace-nowrap ${
                              filters.some(f => f.field === activeTab && f.value === slot)
                                ? "bg-blue-500 text-white"
                                : ""
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        size="md"
                        variant="outline"
                        onClick={handleResetFilter}
                        className="border border-gray-300"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {filters.length > 0 ? "Clear Filters" : "Filter"}
                </span>
              </div>
              <div className="relative group">
                <Button
                  size="icon"
                  variant={loading ? "loading" : "outline"}
                  className="border border-gray-300"
                  onClick={handleDownload}
                >
                  <Download />
                </Button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  Download
                </span>
              </div>
              <div className="relative group">
                <Button
                  size="icon"
                  variant={loading ? "loading" : "outline"}
                  className="border border-gray-300"
                  onClick={fetchFlights}
                >
                  <RefreshCcw />
                </Button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  Refresh
                </span>
              </div>
            </div>
          </div>

          <div className="w-full mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by tail number (e.g., VT-SBR), date (e.g., June 18, 2024), or status (e.g., Completed)"
                className="w-full p-2 border rounded-lg pl-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchInput}
                onChange={(e) => handleSearchChange(e)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        <Card className="w-full flex-1">
          <CardContent>
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[10%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12.5%]" />
                  <col className="w-[12.5%]" />
                  <col className="w-[10%]" />
                  <col className="w-[12.5%]" />
                  <col className="w-[12.5%]" />
                </colgroup>
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-100 uppercase sticky top-0">
                  <tr>
                    <th
                      className="p-3 text-left cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("date")}
                    >
                      DATE {sort.field === "date" && (sort.ascending ? "↑" : "↓")}
                    </th>
                    <th
                      className="p-3 text-left cursor-pointer hover:bg-gray-200"
                      onClick={() => handleSort("tailNumber")}
                    >
                      TAIL NUMBER {sort.field === "tailNumber" && (sort.ascending ? "↑" : "↓")}
                    </th>
                    <th className="p-3 text-left">OUTBOUND TIME</th>
                    <th className="p-3 text-left">INBOUND TIME</th>
                    <th className="p-3 text-left">DURATION</th>
                    <th className="p-3 text-left">STATUS</th>
                    <th className="p-3 text-left">DEPARTURE VIDEO</th>
                    <th className="p-3 text-left">ARRIVAL VIDEO</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="p-3 text-center text-gray-500">
                        <Loader2 className="animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : processedFlights.length > 0 ? (
                    processedFlights.map((flight, i) => (
                      <tr
                        key={`${flight.tailNumber}-${flight.date}-${i}`}
                        className="border-t hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 whitespace-nowrap">{flight.date}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                            {flight.tailNumber}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">{flight.outboundTime}</td>
                        <td className="p-3 whitespace-nowrap">{flight.inboundTime}</td>
                        <td className="p-3 whitespace-nowrap">{flight.duration}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-2 rounded-full text-xs font-medium whitespace-nowrap ${
                              flight.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : flight.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {flight.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {flight.departureVideo !== "Not Available" ? (
                            <a
                              href={flight.departureVideo}
                              className="text-blue-500 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Video
                            </a>
                          ) : (
                            <span className="text-gray-500">
                              {flight.departureVideo}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {flight.arrivalVideo !== "Not Available" ? (
                            <a
                              href={flight.arrivalVideo}
                              className="text-blue-500 hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Video
                            </a>
                          ) : (
                            <span className="text-gray-500">
                              {flight.arrivalVideo}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="p-3 text-center text-gray-500">
                        No flights available or no matches found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {alert && <Alert message={alert.message} type={alert.type} onClose={() => setAlert(null)} />}
    </div>
  );
}

export default FlightTrackingTable;