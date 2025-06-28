"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Plane,
  MapPin,
  Clock,
  Fuel,
  Wind,
  Play,
  RotateCcw,
  Zap,
  DollarSign,
  Route,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
} from "lucide-react"

// Custom Altitude Visualization Component
function AltitudeVisualization({ currentAltitude }: { currentAltitude: number }) {
  const [windowHeight, setWindowHeight] = useState(0)

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
      isMajor: true, // All lines are major since we want to show all values
    })
  })

  return (
    <div className="w-24 sm:w-28 lg:w-32 bg-transparent border-r border-gray-200 flex flex-col py-4 sm:py-6">
      {/* Altitude Label Box */}
      <div className="bg-white border border-gray-200 rounded mx-2 sm:mx-3 mb-4 sm:mb-6 p-2 sm:p-3 text-center">
        <div className="text-xs sm:text-sm font-medium text-gray-900">Altitude</div>
        <div className="text-xs sm:text-sm text-gray-600">feet</div>
      </div>

      {/* Altitude Visualization */}
      <div className="flex-1 flex justify-center items-center min-h-0">
        <div className="relative" style={{ height: getSliderHeight(), width: getSliderWidth() }}>
          {/* Slider Track */}
          <div className="absolute inset-0 bg-gray-300 rounded-sm"></div>

          {/* Grid Lines */}
          {gridLines.map((line) => (
            <div key={line.altitude}>
              {/* Grid line */}
              <div
                className={`absolute w-full ${line.isMajor ? "bg-gray-600" : "bg-gray-400"}`}
                style={{
                  bottom: `${line.position}%`,
                  height: line.isMajor ? "2px sm:3px" : "1px sm:2px",
                  transform: "translateY(50%)",
                }}
              ></div>

              {/* Altitude labels for all lines */}
              <div
                className="absolute text-xs sm:text-sm text-gray-600 font-medium"
                style={{
                  bottom: `${line.position}%`,
                  right: windowHeight < 600 ? "18px" : windowHeight < 800 ? "24px" : "28px",
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
            className="absolute w-full bg-teal-600 transition-all duration-300 ease-in-out"
            style={{
              bottom: `${position}%`,
              height: windowHeight < 600 ? "8px" : windowHeight < 800 ? "10px" : "12px",
              transform: "translateY(50%)",
              borderRadius: "2px",
            }}
          ></div>
        </div>
      </div>

      {/* Current Altitude Value */}
      <div className="bg-white border border-gray-200 rounded mx-2 sm:mx-3 mt-4 sm:mt-6 p-2 sm:p-3 text-center">
        <div className="text-sm sm:text-base font-bold text-gray-900">{currentAltitude.toLocaleString()}</div>
        <div className="text-xs sm:text-sm text-gray-600">ft</div>
      </div>
    </div>
  )
}

export default function FlightRouteOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState(null)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false) // Default: expanded
  const [currentAltitude] = useState(35000)
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

  const handleOptimize = () => {
    setIsOptimizing(true)
    // Simulate optimization process
    setTimeout(() => {
      setOptimizationResults({
        distance: "2,847 nm",
        flightTime: "6h 23m",
        fuelConsumption: "18,450 lbs",
        cost: "$12,340",
        savings: "15%",
        estimatedTime: "6h 23m",
      })
      setIsOptimizing(false)
    }, 3000)
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
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-teal-600 p-1.5 sm:p-2 rounded-full">
              <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">FlightPath Optimizer</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Advanced Route Planning & Optimization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 rounded text-xs sm:text-sm">
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
              ${leftSidebarCollapsed ? "left-0" : getSidebarWidth().replace("w-", "left-")}
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
            flex flex-col relative z-10
          `}
          style={{
            marginLeft: leftSidebarCollapsed ? "-384px" : "0px",
          }}
        >
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
            <Tabs defaultValue="route" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded">
                <TabsTrigger value="route" className="rounded text-xs sm:text-sm">
                  Route
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded text-xs sm:text-sm">
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="route" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* AI Chat Box Section */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                      AI Flight Planning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ai-prompt" className="text-xs sm:text-sm">
                        Describe your flight requirements
                      </Label>
                      <Textarea
                        id="ai-prompt"
                        placeholder="e.g., Find the most fuel-efficient route from New York to Los Angeles avoiding turbulence, departing morning hours..."
                        className="min-h-[60px] sm:min-h-[80px] resize-none rounded text-xs sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="flight-date" className="text-xs sm:text-sm">
                          Flight Date
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <Input id="flight-date" type="date" className="pl-8 sm:pl-10 rounded text-xs sm:text-sm" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timezone" className="text-xs sm:text-sm">
                          Timezone
                        </Label>
                        <Select defaultValue="est">
                          <SelectTrigger className="rounded text-xs sm:text-sm">
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

                    <div className="space-y-2">
                      <Label htmlFor="time-window" className="text-xs sm:text-sm">
                        Time Window
                      </Label>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="flex-1 min-w-0">
                          <Input
                            id="time-from"
                            type="time"
                            className="py-1.5 sm:py-2 rounded text-xs sm:text-sm"
                            placeholder="From"
                          />
                        </div>
                        <span className="text-gray-500 text-xs flex-shrink-0">to</span>
                        <div className="flex-1 min-w-0">
                          <Input
                            id="time-to"
                            type="time"
                            className="py-1.5 sm:py-2 rounded text-xs sm:text-sm"
                            placeholder="To"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Flight Details */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Route className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                      Flight Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="departure" className="text-xs sm:text-sm">
                        Departure Airport
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <Input
                          id="departure"
                          placeholder="JFK - John F. Kennedy Intl"
                          className="pl-8 sm:pl-10 rounded text-xs sm:text-sm"
                          defaultValue="JFK"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arrival" className="text-xs sm:text-sm">
                        Arrival Airport
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                        <Input
                          id="arrival"
                          placeholder="LAX - Los Angeles Intl"
                          className="pl-8 sm:pl-10 rounded text-xs sm:text-sm"
                          defaultValue="LAX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="aircraft" className="text-xs sm:text-sm">
                          Aircraft Type
                        </Label>
                        <Select defaultValue="b737">
                          <SelectTrigger className="rounded text-xs sm:text-sm">
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

                      <div className="space-y-2">
                        <Label htmlFor="passengers" className="text-xs sm:text-sm">
                          Passengers
                        </Label>
                        <Input
                          id="passengers"
                          type="number"
                          defaultValue="180"
                          className="rounded text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization Criteria */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                      Optimization Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select defaultValue="fuel">
                      <SelectTrigger className="rounded text-xs sm:text-sm">
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
                <div className="space-y-2 sm:space-y-3">
                  <Button
                    onClick={handleOptimize}
                    disabled={isOptimizing}
                    className="w-full bg-teal-600 hover:bg-teal-700 rounded text-xs sm:text-sm"
                    size={windowSize.width < 640 ? "sm" : "lg"}
                  >
                    {isOptimizing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                        Optimizing Route...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Optimize Route
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full bg-transparent rounded text-xs sm:text-sm"
                    size={windowSize.width < 640 ? "sm" : "default"}
                  >
                    <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Reset Parameters
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
                {/* Weather Settings */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                      Weather Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Include Wind Data</Label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Turbulence Avoidance</Label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Storm Routing</Label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Settings */}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Content - Map Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Map Container */}
          <div className="flex-1 relative bg-gray-100 min-h-0">
            {/* Interactive Map Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center p-4">
              <div className="text-center max-w-sm">
                <div className="bg-white rounded p-4 sm:p-8 shadow-lg">
                  <div className="bg-teal-600 p-2 sm:p-3 rounded-full w-fit mx-auto mb-3 sm:mb-4">
                    <Plane className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Interactive Flight Map</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                    This area will display the interactive map showing flight routes, waypoints, weather data, and
                    optimization results.
                  </p>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Map integration: Mapbox, Google Maps, or OpenLayers
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Box */}
            {isOptimizing && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <Card className="bg-white shadow-lg rounded mx-4">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-teal-600 mx-auto mb-3 sm:mb-4"></div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Generating Optimal Route</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Analyzing weather patterns, air traffic, and fuel efficiency...
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Route Information Overlay */}
            {optimizationResults && (
              <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                <Card className="bg-white/95 backdrop-blur rounded">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Optimized Route: JFK → LAX</h4>
                      <Badge className="bg-green-100 text-green-800 rounded text-xs">
                        {optimizationResults.savings} Savings
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Route className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{optimizationResults.distance}</div>
                          <div className="text-gray-600">Distance</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{optimizationResults.flightTime}</div>
                          <div className="text-gray-600">Flight Time</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{optimizationResults.fuelConsumption}</div>
                          <div className="text-gray-600">Fuel</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{optimizationResults.cost}</div>
                          <div className="text-gray-600">Total Cost</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Results with Altitude Visualization */}
        <div className={`${getRightSidebarWidth()} bg-white border-l border-gray-200 flex flex-shrink-0 min-w-0`}>
          {/* Custom Altitude Visualization */}
          <AltitudeVisualization currentAltitude={currentAltitude} />

          {/* Analysis Content */}
          <div className="flex-1 p-3 sm:p-4 lg:p-6 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Route Analysis</h3>

            <ScrollArea className="h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)]">
              <div className="space-y-3 sm:space-y-4 pr-2">
                {/* Current Route Info */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base">Current Route</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Status:</span>
                      <span className="font-medium text-right">
                        {isOptimizing ? "Calculating..." : optimizationResults ? "Optimized" : "Ready"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Est. Flight Time:</span>
                      <span className="font-medium text-right">
                        {optimizationResults ? optimizationResults.estimatedTime : "6h 45m"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Waypoints:</span>
                      <span className="font-medium text-right">12</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Altitude:</span>
                      <span className="font-medium text-right">FL350</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Weather Conditions */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Wind className="h-3 w-3 sm:h-4 sm:w-4 text-teal-600 flex-shrink-0" />
                      Weather
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Wind:</span>
                      <span className="font-medium text-right">270°/45kt</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Turbulence:</span>
                      <Badge
                        variant="outline"
                        className="text-yellow-700 border-yellow-200 rounded text-xs flex-shrink-0"
                      >
                        Moderate
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex-shrink-0">Storms:</span>
                      <span className="font-medium text-right">2 Active</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alternative Routes */}
                <Card className="rounded">
                  <CardHeader className="pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base">Alternatives</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="p-2 sm:p-3 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="text-xs sm:text-sm font-medium">Northern Route</div>
                      <div className="text-xs text-gray-600">+23 min, -8% fuel</div>
                    </div>
                    <div className="p-2 sm:p-3 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className="text-xs sm:text-sm font-medium">Southern Route</div>
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
