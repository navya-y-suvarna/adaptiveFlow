import React, { useState } from "react";
import { Upload } from "lucide-react";

const DatasetUpload = ({ onFileUpload, addEvent }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file.name);
    addEvent(`Dataset "${file.name}" uploaded and processed`, "system");

    setTimeout(() => {
      addEvent("Traffic patterns updated based on historical data", "success");
      onFileUpload?.(file);
    }, 1000);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Upload size={20} />
        Smart Traffic Dataset Upload
      </h3>
      <label className="flex-1">
        <input type="file" accept=".csv,.json,.xlsx" onChange={handleFileUpload} className="hidden" />
        <div className="cursor-pointer bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center transition-all">
          <div className="text-gray-300 mb-1">
            {selectedFile ? `Selected: ${selectedFile}` : "Upload Traffic Dataset"}
          </div>
          <div className="text-gray-500 text-sm">Supports CSV, JSON, Excel files</div>
        </div>
      </label>
    </div>
  );
};

export default DatasetUpload;
