"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api-client"
import type { FlightRoute, OptimizationResult } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plane,
  MapPin,
  Wind,
  Play,
  RotateCcw,
  Zap,
  Route,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Eye,
} from "lucide-react"

// Flight routes data for different altitudes - now integrated with backend
const defaultFlightRoutes = [
  {
    id: 1,
    altitude: 25000,
    from: "JFK",
    to: "LAX",
    path: "M 25 35 Q 35 25 45 40",
    color: "#ef4444",
    aircraft: { x: 32, y: 33 },
    waypoints: [
      { x: 30, y: 30 },
      { x: 35, y: 32 },
      { x: 40, y: 35 },
    ],
  },
  {
    id: 2,
    altitude: 30000,
    from: "ORD",
    to: "SFO",
    path: "M 30 40 Q 40 30 50 45",
    color: "#f97316",
    aircraft: { x: 40, y: 37 },
    waypoints: [
      { x: 35, y: 35 },
      { x: 42, y: 32 },
      { x: 47, y: 42 },
    ],
  },
  {
    id: 3,
    altitude: 35000,
    from: "MIA",
    to: "SEA",
    path: "M 20 50 Q 30 35 40 30",
    color: "#eab308",
    aircraft: { x: 30, y: 42 },
    waypoints: [
      { x: 25, y: 45 },
      { x: 32, y: 38 },
      { x: 37, y: 32 },
    ],
  },
  {
    id: 4,
    altitude: 40000,
    from: "DFW",
    to: "BOS",
    path: "M 35 55 Q 50 40 65 35",
    color: "#22c55e",
    aircraft: { x: 50, y: 47 },
    waypoints: [
      { x: 42, y: 50 },
      { x: 55, y: 42 },
      { x: 60, y: 37 },
    ],
  },
  {
    id: 5,
    altitude: 45000,
    from: "ATL",
    to: "DEN",
    path: "M 40 45 Q 50 35 60 40",
    color: "#8b5cf6",
    aircraft: { x: 50, y: 40 },
    waypoints: [
      { x: 45, y: 40 },
      { x: 52, y: 37 },
      { x: 57, y: 39 },
    ],
  },
]

// Interactive Altitude Slider Component
function AltitudeVisualization({
  currentAltitude,
  onAltitudeChange,
}: {
  currentAltitude: number
  onAltitudeChange: (altitude: number) => void
}) {
  const [windowHeight, setWindowHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const updateWindowHeight = () => {
      setWindowHeight(window.innerHeight)
    }

    updateWindowHeight()
    window.addEventListener("resize", updateWindowHeight)

    return () => window.removeEventListener("resize", updateWindowHeight)
  }, [])

  const minAltitude = 25000
  const maxAltitude = 45000
  const altitudeRange = maxAltitude - minAltitude

  // Calculate position as percentage from bottom
  const position = ((currentAltitude - minAltitude) / altitudeRange) * 100

  // Calculate responsive slider height based on window size
  const getSliderHeight = () => {
    if (windowHeight < 600) return "30vh"
    if (windowHeight < 800) return "40vh"
    if (windowHeight < 1000) return "45vh"
    return "50vh"
  }

  // Calculate responsive slider width based on window size
  const getSliderWidth = () => {
    if (windowHeight < 600) return "16px"
    if (windowHeight < 800) return "20px"
    return "24px"
  }

  // Generate grid lines for specific altitude values
  const gridLines = []
  const altitudeValues = [25000, 30000, 35000, 40000, 45000]
  altitudeValues.forEach((alt) => {
    const linePosition = ((alt - minAltitude) / altitudeRange) * 100
    gridLines.push({
      altitude: alt,
      position: linePosition,
      isMajor: true,
    })
  })

  // Handle mouse/touch events for dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    updateAltitudeFromEvent(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateAltitudeFromEvent(e)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const updateAltitudeFromEvent = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const percentage = Math.max(0, Math.min(100, ((rect.height - y) / rect.height) * 100))
    const newAltitude = Math.round(minAltitude + (percentage / 100) * altitudeRange)
    onAltitudeChange(newAltitude)
  }

  return (
    <div className="w-20 sm:w-24 lg:w-28 bg-transparent border-r border-gray-200 flex flex-col py-3 sm:py-4">
      {/* Altitude Label Box */}
      <div className="bg-white border border-gray-200 rounded mx-1 sm:mx-2 mb-3 sm:mb-4 p-1.5 sm:p-2 text-center">
        <div className="text-xs font-medium text-gray-900">Altitude</div>
        <div className="text-xs text-gray-600">feet</div>
      </div>

      {/* Interactive Altitude Slider */}
      <div className="flex-1 flex justify-center items-center min-h-0">
        <div
          className="relative cursor-pointer select-none"
          style={{ height: getSliderHeight(), width: getSliderWidth() }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Slider Track */}
          <div className="absolute inset-0 bg-gray-300 rounded-sm"></div>

          {/* Grid Lines */}
          {gridLines.map((line) => (
            <div key={line.altitude}>
              {/* Grid line */}
              <div
                className={`absolute w-full ${line.isMajor ? "bg-gray-600" : "bg-gray-400"} pointer-events-none`}
                style={{
                  bottom: `${line.position}%`,
                  height: line.isMajor ? "2px" : "1px",
                  transform: "translateY(50%)",
                }}
              ></div>

              {/* Altitude labels for all lines */}
              <div
                className="absolute text-xs text-gray-600 font-medium pointer-events-none"
                style={{
                  bottom: `${line.position}%`,
                  right: windowHeight < 600 ? "18px" : windowHeight < 800 ? "22px" : "26px",
                  transform: "translateY(50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {(line.altitude / 1000).toFixed(0)}k
              </div>
            </div>
          ))}

          {/* Current Altitude Indicator */}
          <div
            className={`absolute w-full bg-teal-600 transition-all duration-150 ease-in-out pointer-events-none ${
              isDragging ? "shadow-lg" : ""
            }`}
            style={{
              bottom: `${position}%`,
              height: windowHeight < 600 ? "10px" : windowHeight < 800 ? "12px" : "14px",
              transform: "translateY(50%)",
              borderRadius: "3px",
            }}
          ></div>

          {/* Draggable Handle */}
          <div
            className={`absolute w-5 h-5 bg-teal-600 border-2 border-white rounded-full shadow-lg transition-all duration-150 ease-in-out ${
              isDragging ? "scale-110 shadow-xl" : "hover:scale-105"
            }`}
            style={{
              bottom: `${position}%`,
              left: "50%",
              transform: "translate(-50%, 50%)",
              cursor: isDragging ? "grabbing" : "grab",
            }}
          ></div>
        </div>
      </div>

      {/* Current Altitude Value */}
      <div className="bg-white border border-gray-200 rounded mx-1 sm:mx-2 mt-3 sm:mt-4 p-1.5 sm:p-2 text-center">
        <div className="text-sm font-bold text-gray-900">{currentAltitude.toLocaleString()}</div>
        <div className="text-xs text-gray-600">ft</div>
      </div>
    </div>
  )
}

// Network World Map Component
function SatelliteMap({
  currentAltitude,
  showAllRoutes,
  flightRoutes,
}: {
  currentAltitude: number
  showAllRoutes: boolean
  flightRoutes: any[]
}) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateWindowSize()
    window.addEventListener("resize", updateWindowSize)

    return () => window.removeEventListener("resize", updateWindowSize)
  }, [])

  // Filter routes based on altitude (within 2500ft range) or show all
  const visibleRoutes = showAllRoutes
    ? flightRoutes
    : flightRoutes.filter((route) => Math.abs(route.altitude - currentAltitude) <= 2500)

  return (
    <div
      className="absolute inset-0 relative"
      style={{
        margin: "16px",
        width: "calc(100% - 32px)",
        height: "calc(100% - 32px)",
        overflow: "hidden",
      }}
    >
      {/* Network world map background */}
      <img
        src="/images/network-world-map.png"
        alt="Global network connectivity map"
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      />

      {/* Subtle overlay for better contrast */}
      <div className="absolute inset-0 bg-black/5"></div>

      {/* Flight route overlay */}
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{
            minWidth: "100%",
            minHeight: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            transition: "all 300ms ease-in-out",
          }}
        >
          <defs>
            {visibleRoutes.map((route) => (
              <linearGradient
                key={`gradient-${route.id}`}
                id={`routeGradient-${route.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={route.color} stopOpacity="0.8" />
                <stop offset="50%" stopColor={route.color} stopOpacity="1" />
                <stop offset="100%" stopColor={route.color} stopOpacity="0.8" />
              </linearGradient>
            ))}
          </defs>

          {/* Render visible flight paths */}
          {visibleRoutes.map((route) => (
            <path
              key={`path-${route.id}`}
              d={route.path}
              stroke={`url(#routeGradient-${route.id})`}
              strokeWidth={windowSize.width < 768 ? "0.8" : windowSize.width < 1024 ? "1" : "1.2"}
              fill="none"
              strokeDasharray={windowSize.width < 768 ? "3,1.5" : "4,2"}
              className="animate-pulse"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* Render waypoints for visible routes */}
        {visibleRoutes.map((route) =>
          route.waypoints.map((waypoint: any, index: number) => (
            <div
              key={`waypoint-${route.id}-${index}`}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full shadow-sm border border-white"
              style={{
                top: `${waypoint.y}%`,
                left: `${waypoint.x}%`,
                transform: "translate(-50%, -50%)",
              }}
            ></div>
          )),
        )}

        {/* Render aircraft for visible routes */}
        {visibleRoutes.map((route) => (
          <div
            key={`aircraft-${route.id}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              top: `${route.aircraft.y}%`,
              left: `${route.aircraft.x}%`,
            }}
          >
            <div className="bg-white rounded-full p-1.5 shadow-lg border-2 border-teal-600">
              <Plane className="h-3 w-3 text-teal-600 transform rotate-45" />
            </div>
          </div>
        ))}
      </div>

      {/* Map overlay with flight information */}
      <div
        className="absolute bg-white/90 backdrop-blur text-gray-900 p-3 rounded-lg border border-gray-200 shadow-lg"
        style={{
          top: "16px",
          left: "16px",
          maxWidth: windowSize.width < 768 ? "200px" : "250px",
          zIndex: 20,
        }}
      >
        <div className="text-sm font-semibold">Global Network View</div>
        <div className="text-xs text-gray-600">
          {showAllRoutes ? "All Routes" : `FL${Math.round(currentAltitude / 100)} Routes`}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {visibleRoutes.length} active flight{visibleRoutes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Coordinates overlay */}
      <div
        className="absolute bg-white/90 backdrop-blur text-gray-900 p-2 rounded text-xs border border-gray-200 shadow-lg"
        style={{
          bottom: "16px",
          right: "16px",
        }}
      >
        <div className="font-mono text-xs">Live positioning data</div>
        <div className="text-xs text-gray-600 mt-1">Multiple aircraft tracking</div>
      </div>

      {/* Status indicators */}
      <div
        className="absolute space-y-2"
        style={{
          top: "16px",
          right: "16px",
        }}
      >
        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">LIVE</div>
        <div className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs shadow-lg">NETWORK</div>
      </div>

      {/* Network activity indicators */}
      <div className="absolute top-[25%] left-[50%] w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
      <div
        className="absolute top-[45%] left-[30%] w-2 h-2 bg-green-400 rounded-full animate-ping"
        style={{ animationDelay: "0.5s" }}
      ></div>
      <div
        className="absolute top-[55%] left-[70%] w-2 h-2 bg-purple-400 rounded-full animate-ping"
        style={{ animationDelay: "1s" }}
      ></div>
    </div>
  )
}

export default function FlightRouteOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [currentAltitude, setCurrentAltitude] = useState(35000)
  const [showAllRoutes, setShowAllRoutes] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [flightRoutes, setFlightRoutes] = useState(defaultFlightRoutes)
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null)

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateWindowSize()
    window.addEventListener("resize", updateWindowSize)

    return () => window.removeEventListener("resize", updateWindowSize)
  }, [])

  // Load flights from backend
  useEffect(() => {
    loadFlights()
  }, [currentAltitude, showAllRoutes])

  const loadFlights = async () => {
    try {
      const filters = showAllRoutes
        ? {}
        : {
            altitudeRange: {
              min: currentAltitude - 2500,
              max: currentAltitude + 2500,
            },
          }

      const response = await apiClient.getFlights(filters, { limit: 50 })

      if (response.success && response.data) {
        // Convert backend data to frontend format
        const convertedRoutes = response.data.map((flight: FlightRoute, index: number) => ({
          id: flight.id,
          altitude: flight.altitude,
          from: flight.departureAirport?.code || "UNK",
          to: flight.arrivalAirport?.code || "UNK",
          path: defaultFlightRoutes[index % defaultFlightRoutes.length]?.path || "M 25 35 Q 35 25 45 40",
          color: defaultFlightRoutes[index % defaultFlightRoutes.length]?.color || "#ef4444",
          aircraft: defaultFlightRoutes[index % defaultFlightRoutes.length]?.aircraft || { x: 32, y: 33 },
          waypoints: defaultFlightRoutes[index % defaultFlightRoutes.length]?.waypoints || [],
          flightData: flight,
        }))

        setFlightRoutes(convertedRoutes.length > 0 ? convertedRoutes : defaultFlightRoutes)
      }
    } catch (error) {
      console.error("Failed to load flights:", error)
      // Fall back to default routes
      setFlightRoutes(defaultFlightRoutes)
    }
  }

  const handleOptimize = async () => {
    if (!selectedFlightId) {
      // Create a new flight for optimization
      try {
        const newFlight = await apiClient.createFlight({
          flightNumber: "OPT" + Date.now(),
          departureAirportId: "jfk-uuid", // You would get this from airport selection
          arrivalAirportId: "lax-uuid",
          aircraftId: "b737-uuid",
          altitude: currentAltitude,
          distance: 2475.5,
          estimatedFlightTime: 360,
          fuelConsumption: 18450.0,
          cost: 12340.0,
          passengers: 180,
          optimizationCriteria: "balanced",
        })

        if (newFlight.success && newFlight.data) {
          setSelectedFlightId(newFlight.data.id)
          await optimizeRoute(newFlight.data.id)
        }
      } catch (error) {
        console.error("Failed to create flight:", error)
        // Fall back to simulation
        simulateOptimization()
      }
    } else {
      await optimizeRoute(selectedFlightId)
    }
  }

  const optimizeRoute = async (flightId: string) => {
    setIsOptimizing(true)

    try {
      const response = await apiClient.optimizeRoute({
        flightRouteId: flightId,
        criteria: "balanced",
        constraints: {
          maxAltitude: 42000,
          minAltitude: 28000,
          avoidTurbulence: true,
          avoidStorms: true,
        },
        weatherData: true,
        realTimeUpdates: false,
      })

      if (response.success && response.data) {
        setOptimizationResults(response.data)
      }
    } catch (error) {
      console.error("Optimization failed:", error)
      // Fall back to simulation
      simulateOptimization()
    } finally {
      setIsOptimizing(false)
    }
  }

  const simulateOptimization = () => {
    setIsOptimizing(true)
    // Simulate optimization process
    setTimeout(() => {
      setOptimizationResults({
        originalRoute: {} as FlightRoute,
        optimizedRoute: {} as FlightRoute,
        improvements: {
          fuelSavings: 0.15,
          timeSavings: 0.05,
          costSavings: 0.12,
          distanceChange: -0.03,
        },
        confidence: 0.92,
        alternativeRoutes: [],
        weatherImpact: ["Weather conditions analyzed"],
        recommendations: ["Route optimized for efficiency"],
      })
      setIsOptimizing(false)
    }, 3000)
  }

  const handleAltitudeChange = (newAltitude: number) => {
    setCurrentAltitude(newAltitude)
  }

  // Responsive sidebar width
  const getSidebarWidth = () => {
    if (windowSize.width < 640) return "w-80"
    if (windowSize.width < 1024) return "w-96"
    return "w-96"
  }

  // Responsive right sidebar width
  const getRightSidebarWidth = () => {
    if (windowSize.width < 768) return "w-80"
    if (windowSize.width < 1024) return "w-96"
    return "w-[420px]"
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 sm:py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-teal-600 p-1.5 sm:p-2 rounded-full">
              <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">FlightPath Optimizer</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Advanced Route Planning & Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 rounded text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 sm:mr-2"></div>
              <span className="hidden sm:inline">System Online</span>
              <span className="sm:hidden">Online</span>
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative min-h-0">
        {/* Left Sidebar Toggle Button */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-30">
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className={`
              bg-teal-600 hover:bg-teal-700 text-white px-1.5 py-3 sm:px-2 sm:py-4
              transition-all duration-300 ease-in-out
              shadow-lg border border-teal-700
              rounded-md
            `}
            style={{
              position: "absolute",
              left: leftSidebarCollapsed
                ? "0px"
                : windowSize.width < 640
                  ? "320px"
                  : windowSize.width < 1024
                    ? "384px"
                    : "384px",
            }}
          >
            {leftSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>

        {/* Left Sidebar - Controls */}
        <div
          className={`
            ${leftSidebarCollapsed ? "w-0" : getSidebarWidth()} 
            transition-all duration-300 ease-in-out bg-white border-r border-gray-200 
            flex flex-col relative z-10 overflow-hidden
          `}
        >
          <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded h-8">
                <TabsTrigger value="route" className="rounded text-xs">
                  Route
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded text-xs">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="route" className="space-y-3 mt-3">
                {/* Display All Routes Toggle */}
                <Card className="rounded">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-teal-600" />
                        <Label htmlFor="show-all-routes" className="text-sm font-medium">
                          Display All Routes
                        </Label>
                      </div>
                      <Switch id="show-all-routes" checked={showAllRoutes} onCheckedChange={setShowAllRoutes} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Show flights at all altitudes simultaneously</p>
                  </CardContent>
                </Card>

                {/* AI Chat Box Section */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      AI Flight Planning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="ai-prompt" className="text-xs">
                        Describe your flight requirements
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="e.g., Find the most fuel-efficient route from New York to Los Angeles..."
                        className="min-h-[50px] resize-none rounded text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="flight-date" className="text-xs">
                          Flight Date
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                          <Input id="flight-date" type="date" className="pl-7 rounded text-xs h-8" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="timezone" className="text-xs">
                          Timezone
                        </Label>
                        <Select defaultValue="est">
                          <SelectTrigger className="rounded text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded">
                            <SelectItem value="est">EST (UTC-5)</SelectItem>
                            <SelectItem value="pst">PST (UTC-8)</SelectItem>
                            <SelectItem value="cst">CST (UTC-6)</SelectItem>
                            <SelectItem value="mst">MST (UTC-7)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="time-window" className="text-xs">
                        Time Window
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input id="time-from" type="time" className="rounded text-xs h-8" placeholder="From" />
                        <span className="text-gray-500 text-xs">to</span>
                        <Input id="time-to" type="time" className="rounded text-xs h-8" placeholder="To" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Flight Details */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Route className="h-4 w-4 text-teal-600" />
                      Flight Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="departure" className="text-xs">
                        Departure Airport
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          id="departure"
                          placeholder="JFK - John F. Kennedy Intl"
                          className="pl-7 rounded text-xs h-8"
                          defaultValue="JFK"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="arrival" className="text-xs">
                        Arrival Airport
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2 top-2 h-3 w-3 text-gray-400" />
                        <Input
                          id="arrival"
                          placeholder="LAX - Los Angeles Intl"
                          className="pl-7 rounded text-xs h-8"
                          defaultValue="LAX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="aircraft" className="text-xs">
                          Aircraft Type
                        </Label>
                        <Select defaultValue="b737">
                          <SelectTrigger className="rounded text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded">
                            <SelectItem value="b737">Boeing 737</SelectItem>
                            <SelectItem value="a320">Airbus A320</SelectItem>
                            <SelectItem value="b777">Boeing 777</SelectItem>
                            <SelectItem value="a350">Airbus A350</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="passengers" className="text-xs">
                          Passengers
                        </Label>
                        <Input id="passengers" type="number" defaultValue="180" className="rounded text-xs h-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Criteria */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-teal-600" />
                      Optimization Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select defaultValue="fuel">
                      <SelectTrigger className="rounded text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded">
                        <SelectItem value="fuel">Minimize Fuel Consumption</SelectItem>
                        <SelectItem value="time">Minimize Flight Time</SelectItem>
                        <SelectItem value="cost">Minimize Total Cost</SelectItem>
                        <SelectItem value="balanced">Balanced Optimization</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="w-full bg-teal-600 hover:bg-teal-700 rounded text-xs h-8"
                  >
                    {isOptimizing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                        Optimizing Route...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-2" />
                        Optimize Route
                      </>
                    )}
                  </Button>

                  <Button variant="outline" className="w-full bg-transparent rounded text-xs h-8">
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Reset Parameters
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative">
          <SatelliteMap currentAltitude={currentAltitude} showAllRoutes={showAllRoutes} flightRoutes={flightRoutes} />
        </div>

        {/* Right Sidebar - Optimization Results */}
        {/* Right Sidebar - Results with Altitude Visualization */}
        <div className={`${getRightSidebarWidth()} bg-white border-l border-gray-200 flex flex-shrink-0 min-w-0`}>
          {/* Interactive Altitude Visualization */}
          <AltitudeVisualization currentAltitude={currentAltitude} onAltitudeChange={handleAltitudeChange} />

          {/* Analysis Content */}
          <div className="flex-1 p-3 sm:p-4 lg:p-5 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Route Analysis</h3>

            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-3 pr-2">
                {/* Current Route Info */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Current Route</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Status:</span>
                      <span className="font-medium text-right">
                        {isOptimizing ? "Calculating..." : optimizationResults ? "Optimized" : "Ready"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Est. Flight Time:</span>
                      <span className="font-medium text-right">{optimizationResults ? "6h 23m" : "6h 45m"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Waypoints:</span>
                      <span className="font-medium text-right">12</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Altitude:</span>
                      <span className="font-medium text-right">FL{Math.round(currentAltitude / 100)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Confidence:</span>
                      <span className="font-medium text-right">
                        {optimizationResults ? `${Math.round(optimizationResults.confidence * 100)}%` : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Weather Conditions */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wind className="h-3 w-3 text-teal-600 flex-shrink-0" />
                      Weather
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Wind:</span>
                      <span className="font-medium text-right">270°/45kt</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 flex-shrink-0">Turbulence:</span>
                      <Badge
                        variant="outline"
                        className="text-yellow-700 border-yellow-200 rounded text-xs flex-shrink-0"
                      >
                        Moderate
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 flex-shrink-0">Storms:</span>
                      <span className="font-medium text-right">2 Active</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Results */}
                {optimizationResults && (
                  <Card className="rounded">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Optimization Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 flex-shrink-0">Fuel Savings:</span>
                        <span className="font-medium text-right text-green-600">
                          {Math.round(optimizationResults.improvements.fuelSavings * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 flex-shrink-0">Time Savings:</span>
                        <span className="font-medium text-right text-green-600">
                          {Math.round(optimizationResults.improvements.timeSavings * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 flex-shrink-0">Cost Savings:</span>
                        <span className="font-medium text-right text-green-600">
                          {Math.round(optimizationResults.improvements.costSavings * 100)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Alternative Routes */}
                <Card className="rounded">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Alternatives</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="text-xs font-medium">Northern Route</div>
                      <div className="text-xs text-gray-600">+23 min, -8% fuel</div>
                    </div>
                    <div className="p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="text-xs font-medium">Southern Route</div>
                      <div className="text-xs text-gray-600">+15 min, +3% fuel</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
