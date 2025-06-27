package clients

// Aircraft represents aircraft data
type Aircraft struct {
	AirplaneID          string `json:"airplaneId"`
	NumberRegistration  string `json:"numberRegistration"`
	ProductionLine      string `json:"productionLine"`
	AirplaneIataType    string `json:"airplaneIataType"`
	PlaneModel          string `json:"planeModel"`
	ModelCode           string `json:"modelCode"`
	HexIcaoAirplane     string `json:"hexIcaoAirplane"`
	CodeIataPlaneShort  string `json:"codeIataPlaneShort"`
	CodeIataPlaneLong   string `json:"codeIataPlaneLong"`
	ConstructionNumber  string `json:"constructionNumber"`
	RolloutDate         string `json:"rolloutDate"`
	FirstFlight         string `json:"firstFlight"`
	DeliveryDate        string `json:"deliveryDate"`
	RegistrationDate    string `json:"registrationDate"`
	CodeIataAirline     string `json:"codeIataAirline"`
	EnginesCount        string `json:"enginesCount"`
	EnginesType         string `json:"enginesType"`
	PlaneAge            string `json:"planeAge"`
	PlaneStatus         string `json:"planeStatus"`
}

// AircraftAPI handles aircraft data
type AircraftAPI struct {
	fetcher *Fetcher
	parser  *Parser
}

// NewAircraftAPI creates a new AircraftAPI instance
func NewAircraftAPI() *AircraftAPI {
	return &AircraftAPI{
		fetcher: NewFetcher(),
		parser:  NewParser(),
	}
}

// GetAircraft fetches aircraft data
func (a *AircraftAPI) GetAircraft(params map[string]string) ([]Aircraft, error) {
	data, err := a.fetcher.Get("airplaneDatabase", params)
	if err != nil {
		return nil, err
	}
	
	return a.parser.ParseAircraftResponse(data)
}

