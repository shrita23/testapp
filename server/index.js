const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import model factories
const createFlightLogModel = require('./models/flightLog');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});
app.use(cors({
    origin: 'https://testapp-t31j.vercel.app'
}));


// 🔌 DATABASE CONNECTIONS

const flightConnection = mongoose.createConnection("mongodb+srv://tanugarima712:tanu2004@cluster0.4glcoq0.mongodb.net/flight_database", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 🧠 MODELS
const FlightLog = createFlightLogModel(flightConnection);

// Connection event listeners


flightConnection.on('connected', () => {
    console.log('✅ Connected to flight database!');
});
flightConnection.on('error', (err) => {
    console.error('❌ Flight DB connection error:', err);
});

console.log('Flight model collection name:', FlightLog.collection.name);


// ✈️ GET FLIGHT LOGS WITH DURATIONS - IMPROVED VERSION
// ✈️ GET FLIGHT LOGS WITH DURATIONS - IMPROVED VERSION
app.get('/flights-with-durations', async (req, res) => {
    try {
        const logs = await FlightLog.find().sort({ timestamp: 1 });
        console.log('Fetched logs count:', logs.length); // Debug log
        
        const flights = {};
        const completeFlights = [];
        
        logs.forEach(log => {
            try {
                console.log('Processing log:', log); // Log the full document
                let dateObj;
                // Handle timestamp safely
                if (!log.timestamp || log.timestamp === 'undefined') {
                    console.warn('Missing or undefined timestamp for log:', log);
                    dateObj = new Date(); // Fallback to current date
                } else {
                    dateObj = new Date(log.timestamp);
                    if (isNaN(dateObj.getTime())) {
                        console.warn('Invalid timestamp format, falling back. Raw value:', log.timestamp, 'Log:', log);
                        dateObj = new Date(); // Fallback to current date
                    }
                }
                
                const dateStr = dateObj.toISOString().split('T')[0];
                const key = `${log.tail_number}_${dateStr}`;
                
                if (!flights[key]) {
                    flights[key] = [];
                }
                
                flights[key].push({
                    ...log.toObject(),
                    parsedDate: dateObj
                });
            } catch (err) {
                console.error('Error processing flight log:', err);
            }
        });
        
        Object.values(flights).forEach(tailFlights => {
            tailFlights.sort((a, b) => a.parsedDate - b.parsedDate);
            
            for (let i = 0; i < tailFlights.length; i++) {
                const current = tailFlights[i];
                let next = tailFlights[i + 1];
                
                if (current.status === 'departing' && next && next.status === 'arriving') {
                    const departureTime = current.parsedDate;
                    const arrivalTime = next.parsedDate;
                    const durationMs = arrivalTime - departureTime;
                    const durationMinutes = Math.floor(durationMs / 60000);
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    
                    completeFlights.push({
                        tailNumber: current.tail_number,
                        date: departureTime.toLocaleDateString('en-US', {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        }),
                        outboundTime: departureTime.toLocaleTimeString('en-US', {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }),
                        inboundTime: arrivalTime.toLocaleTimeString('en-US', {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }),
                        duration: `${hours}h ${minutes}m`,
                        status: "Completed",
                        departureVideo: "https://dummyvideo1.com",
                        arrivalVideo: "https://dummyvideo2.com"
                    });
                    i++; // Skip the next entry as it's paired
                } else if (current.status === 'departing') {
                    const flightTime = current.parsedDate;
                    completeFlights.push({
                        tailNumber: current.tail_number,
                        date: flightTime.toLocaleDateString('en-US', {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        }),
                        outboundTime: flightTime.toLocaleTimeString('en-US', {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }),
                        inboundTime: "—",
                        duration: "—",
                        status: "In Progress",
                        departureVideo: "https://dummyvideo1.com",
                        arrivalVideo: "Not Available"
                    });
                } else if (current.status === 'arriving' && !tailFlights[i - 1]?.status === 'departing') {
                    const flightTime = current.parsedDate;
                    completeFlights.push({
                        tailNumber: current.tail_number,
                        date: flightTime.toLocaleDateString('en-US', {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                        }),
                        outboundTime: "—",
                        inboundTime: flightTime.toLocaleTimeString('en-US', {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                        }),
                        duration: "—",
                        status: "Arrived",
                        departureVideo: "Not Available",
                        arrivalVideo: "https://dummyvideo2.com"
                    });
                }
            }
        });
        
        completeFlights.sort((a, b) => new Date(b.date + " " + b.outboundTime) - new Date(a.date + " " + a.outboundTime));
        console.log('Processed flights count:', completeFlights.length); // Debug log
        res.json(completeFlights);
    } catch (err) {
        console.error("Flight log error:", err);
        res.status(500).json({ message: "Error fetching flight logs", error: err.message });
    }
});

app.get('/flight-costs', async (req, res) => {
    console.log('Received request for /flight-costs');
    try {
        const logs = await FlightLog.find().sort({ timestamp: -1 });
        console.log('Fetched logs count:', logs.length);
        if (logs.length === 0) {
            console.log('Warning: No logs found in FlightLog collection');
            return res.json({ message: "No flight logs available" });
        }

        const flights = {};
        logs.forEach((log, index) => {
            try {
                // Log raw timestamp for debugging
                console.log(`Log ${index} timestamp:`, log.timestamp, 'Type:', typeof log.timestamp, 'Is Date:', log.timestamp instanceof Date);

                // Validate required fields
                if (!log.tail_number || !log.status) {
                    console.warn(`Skipping log ${index}: Missing required fields (tail_number or status)`, log);
                    return;
                }
                if (!log.timestamp) {
                    console.warn(`Skipping log ${index}: Missing timestamp`, log);
                    return;
                }

                // Parse timestamp
                let dateObj;
                if (log.timestamp instanceof Date && !isNaN(log.timestamp.getTime())) {
                    dateObj = log.timestamp;
                } else if (typeof log.timestamp === 'string' && log.timestamp.trim() !== '') {
                    dateObj = new Date(log.timestamp);
                    if (isNaN(dateObj.getTime())) {
                        console.warn(`Skipping log ${index}: Invalid timestamp format`, log.timestamp, log);
                        return;
                    }
                } else {
                    console.warn(`Skipping log ${index}: Invalid timestamp type or value`, log.timestamp, log);
                    return;
                }

                const dateStr = dateObj.toISOString().split('T')[0];
                const key = `${log.tail_number}_${dateStr}`;

                if (!flights[key]) {
                    flights[key] = [];
                }
                flights[key].push({
                    ...log.toObject(),
                    parsedDate: dateObj
                });
            } catch (err) {
                console.warn(`Error processing log ${index}:`, err.message, log);
            }
        });

        const completeFlights = [];
        Object.values(flights).forEach((tailFlights, index) => {
            try {
                tailFlights.sort((a, b) => a.parsedDate - b.parsedDate);

                for (let i = 0; i < tailFlights.length; i++) {
                    const current = tailFlights[i];
                    let next = tailFlights[i + 1];

                    if (current.status === 'departing' && next && next.status === 'arriving') {
                        const departureTime = current.parsedDate;
                        const arrivalTime = next.parsedDate;
                        const durationMs = arrivalTime - departureTime;

                        // Skip if duration is negative
                        if (durationMs < 0) {
                            console.warn(`Skipping flight ${index}: Negative duration`, { current, next });
                            completeFlights.push({
                                tailNumber: current.tail_number,
                                date: departureTime.toLocaleDateString('en-US', {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                }),
                                outboundTime: departureTime.toLocaleTimeString('en-US', {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true
                                }),
                                inboundTime: "—",
                                flightHours: 0,
                                totalCost: 0,
                                school: "Sky Aviation",
                                status: "In Progress"
                            });
                            continue;
                        }

                        const durationMinutes = Math.floor(durationMs / 60000);
                        const flightHours = durationMinutes / 60;
                        const totalCost = flightHours * 8500;

                        completeFlights.push({
                            tailNumber: current.tail_number,
                            date: departureTime.toLocaleDateString('en-US', {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            }),
                            outboundTime: departureTime.toLocaleTimeString('en-US', {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true
                            }),
                            inboundTime: arrivalTime.toLocaleTimeString('en-US', {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true
                            }),
                            flightHours: flightHours.toFixed(1),
                            totalCost: Math.round(totalCost),
                            school: "Sky Aviation",
                            status: "Completed"
                        });
                        i++;
                    } else if (current.status === 'departing') {
                        const flightTime = current.parsedDate;
                        completeFlights.push({
                            tailNumber: current.tail_number,
                            date: flightTime.toLocaleDateString('en-US', {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                            }),
                            outboundTime: flightTime.toLocaleTimeString('en-US', {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true
                            }),
                            inboundTime: "—",
                            flightHours: 0,
                            totalCost: 0,
                            school: "Sky Aviation",
                            status: "In Progress"
                        });
                    }
                    // Ignore unpaired arriving logs
                }
            } catch (err) {
                console.warn(`Error processing flight group ${index}:`, err.message);
            }
        });

        completeFlights.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log('Processed flights count:', completeFlights.length);
        res.json(completeFlights.length > 0 ? completeFlights : { message: "No complete flight data available" });
    } catch (err) {
        console.error("Flight costs error:", err.stack);
        res.status(500).json({ message: "Error fetching flight costs", error: err.message });
    }
});
        
// 🚀 SERVER
app.listen(3001, () => {
    console.log("✅ Server running on http://localhost:3001");
});