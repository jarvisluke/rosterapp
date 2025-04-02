function SimulationReport({ htmlContent, height = '500px' }) {
    return (
        <div
            className="border rounded bg-light"
            style={{ height: height, overflow: 'auto' }}
        >
            <iframe
                srcDoc={htmlContent}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
                title="Simulation Report"
            />
        </div>
    );
}

export default SimulationReport