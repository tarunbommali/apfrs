/* eslint-disable no-unused-vars */
import React from 'react';

const FilterSection = ({ filters, departments, designations, onFilterChange, onClearFilters, filteredCount, totalCount }) => {
  const hasActiveFilters = filters.department || filters.designation || filters.status || filters.search;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search by name, ID, department..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => onFilterChange('department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Designation Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Designation
          </label>
          <select
            value={filters.designation}
            onChange={(e) => onFilterChange('designation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Designations</option>
            {designations.map(desig => (
              <option key={desig} value={desig}>{desig}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="Good">Good (≥75%)</option>
            <option value="Average">Average (50-74%)</option>
            <option value="Poor">Poor (&lt;50%)</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="flex items-end">
          <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg w-full">
            Showing {filteredCount} of {totalCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;