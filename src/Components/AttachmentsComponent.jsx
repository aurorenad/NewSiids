import React, { useState } from 'react';
import { Paperclip } from 'lucide-react';

const AttachmentsComponent = () => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };

    const removeFile = (index) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        setIsSubmitting(true);

        // Simulate API call with timeout
        setTimeout(() => {
            setIsSubmitting(false);
            alert("Files submitted successfully!");
            setFiles([]);
        }, 1000);
    };

    const handleCancel = () => {
        setFiles([]);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-100 p-4 border-b">
                    <h1 className="text-xl font-semibold text-center text-gray-800">Attachments</h1>
                </div>

                <div className="p-6">
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-64 
              ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <p className="text-gray-700 mb-4">
                            Attach all necessary documents to support the claim
                        </p>

                        {files.length > 0 ? (
                            <div className="w-full mt-4">
                                <ul className="space-y-2">
                                    {files.map((file, index) => (
                                        <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                            <div className="flex items-center">
                                                <Paperclip className="h-4 w-4 text-blue-500 mr-2" />
                                                <span className="text-sm truncate max-w-xs">{file.name}</span>
                                            </div>
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Paperclip className="h-12 w-12 text-gray-400 mb-2" />
                                <label className="cursor-pointer bg-blue-100 text-blue-800 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors mt-2">
                                    <span>Select Files</span>
                                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                </label>
                                <p className="text-gray-500 text-sm mt-2">or drag and drop files here</p>
                            </div>
                        )}
                    </div>

                    {files.length > 0 && (
                        <div className="mt-4">
                            <label className="cursor-pointer bg-blue-100 text-blue-800 px-4 py-1 rounded-md hover:bg-blue-200 transition-colors inline-block">
                                <span>Add More Files</span>
                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    )}

                    <div className="mt-6 flex justify-center gap-4">
                        <button
                            onClick={handleCancel}
                            className="px-6 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center"
                            disabled={files.length === 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="mr-2">Submitting...</span>
                                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                </>
                            ) : (
                                'Submit'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttachmentsComponent;