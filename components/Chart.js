function CustomChart({ type = 'bar', data, options, height = 300 }) {
    const canvasRef = React.useRef(null);
    const chartInstance = React.useRef(null);

    React.useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;

        const ctx = canvasRef.current.getContext('2d');
        
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        };

        chartInstance.current = new window.Chart(ctx, {
            type,
            data,
            options: { ...defaultOptions, ...options }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [type, data, options]);

    return (
        <div style={{ height: `${height}px`, width: '100%' }} data-name="custom-chart" data-file="components/Chart.js">
            <canvas ref={canvasRef}></canvas>
        </div>
    );
}